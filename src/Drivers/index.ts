'use strict'

import {
  CannotCopyFileException,
  CannotMoveFileException,
  CannotReadFileException,
  CannotWriteFileException,
  CannotDeleteFileException,
  CannotGetMetaDataException,
  CannotSetVisibilityException,
  Exception,
} from '@adonisjs/core/build/standalone'

import {
  Visibility,
  DriveFileStats,
  AzureStorageDriverConfig,
  AzureStorageDriverContract,
} from '@ioc:Adonis/Core/Drive'

import { DefaultAzureCredential } from '@azure/identity'
import {
  newPipeline,
  BlobServiceClient,
  StorageSharedKeyCredential,
  BlobDownloadOptions,
  BlobDownloadToBufferOptions,
  BlobExistsOptions,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  BlobSASSignatureValues,
  BlockBlobUploadOptions,
  BlockBlobUploadStreamOptions,
  ContainerCreateOptions,
  ContainerDeleteMethodOptions,
  ContainerExistsOptions,
  ContainerCreateResponse,
  ContainerDeleteResponse,
} from '@azure/storage-blob'
import { ReadStream } from 'fs'
import {
  CannotCreateContainerException,
  CannotDeleteContainerException,
  CannotFindContainerException,
} from './utils'

export class AzureStorageDriver implements AzureStorageDriverContract {
  /**
   * Reference to the Azure storage instance
   */
  public adapter: BlobServiceClient

  /**
   * Name of the driver
   */
  public name: 'AzureStorage' = 'AzureStorage'

  constructor(private config: AzureStorageDriverConfig) {
    if (typeof config.connection_string !== 'undefined') {
      // eslint-disable-next-line
      this.adapter = BlobServiceClient.fromConnectionString(
        config.connection_string
      )
    } else {
      let credential: any
      if (config.azure_tenant_id && config.azure_client_id && config.azure_client_secret) {
        credential = new DefaultAzureCredential()
      } else if (config.name && config.key) {
        credential = new StorageSharedKeyCredential(config.name, config.key)
      }

      let url = `https://${this.config.name}.blob.core.windows.net`

      if (typeof this.config.local_address !== 'undefined') {
        url = this.config.local_address
      }

      const azurePipeline = newPipeline(credential)

      this.adapter = new BlobServiceClient(url, azurePipeline)
    }
  }

  public getBlockBlobClient(location: string) {
    const container = this.config.container as string

    const containerClient = this.adapter.getContainerClient(container)
    return containerClient.getBlockBlobClient(location)
  }

  public async generateBlobSASURL(
    blockBlobClient: { containerName: any; location: any; credential: any; url: any },
    options: BlobSASSignatureValues
  ): Promise<string> {
    options.permissions =
      options.permissions === undefined || typeof options.permissions === 'string'
        ? BlobSASPermissions.parse(options.permissions || 'r')
        : options.permissions

    options.startsOn = options.startsOn || new Date()
    options.expiresOn = options.expiresOn || new Date(options.startsOn.valueOf() + 3600 * 1000)

    const blobSAS = await generateBlobSASQueryParameters(
      {
        containerName: blockBlobClient.containerName, // Required
        blobName: blockBlobClient.location, // Required
        permissions: options.permissions, // Required
        startsOn: options.startsOn,
        expiresOn: options.expiresOn,
      },
      blockBlobClient.credential
    )

    return `${blockBlobClient.url}?${blobSAS.toString()}`
  }

  public async existsContainer(
    container: string,
    options?: ContainerExistsOptions
  ): Promise<boolean> {
    const containerClient = this.adapter.getContainerClient(container)
    try {
      return await containerClient.exists(options)
    } catch (error) {
      throw CannotFindContainerException.invoke(container, error)
    }
  }

  /**
   * Creates a new container under the specified account. If the container with the same name already exists, the operation fails.
   * @param container A container name
   * @param options Options to Container Create operation.
   * @returns
   */
  public async createContainer(
    container: string,
    options?: ContainerCreateOptions
  ): Promise<ContainerCreateResponse> {
    const containerClient = this.adapter.getContainerClient(container)
    try {
      return await containerClient.create(options)
    } catch (error) {
      throw CannotCreateContainerException.invoke(container, error)
    }
  }

  /**
   * Marks the specified container for deletion. The container and any blobs contained within it are later deleted during garbage collection.
   * @param container A container name
   * @param options Options to Container Delete operation.
   * @returns
   */
  public async deleteContainer(
    container: string,
    options?: ContainerDeleteMethodOptions
  ): Promise<ContainerDeleteResponse> {
    const containerClient = this.adapter.getContainerClient(container)
    try {
      return await containerClient.delete(options)
    } catch (error) {
      throw CannotDeleteContainerException.invoke(container, error)
    }
  }

  /**
   * Returns the file contents as a buffer. The buffer return
   * value allows you to self choose the encoding when
   * converting the buffer to a string.
   */
  public async get(
    location: string,
    options: BlobDownloadToBufferOptions | any = {}
  ): Promise<Buffer> {
    try {
      const blockBlobClient = this.getBlockBlobClient(location)
      return await blockBlobClient.downloadToBuffer(0, 0, options)
    } catch (error) {
      throw CannotReadFileException.invoke(location, error)
    }
  }

  /**
   * Returns the file contents as a stream
   */
  public async getStream(
    location: string,
    options: BlobDownloadOptions | any = {}
  ): Promise<NodeJS.ReadableStream> {
    return (await this.getBlockBlobClient(location).download(0, 0, options))
      .readableStreamBody as NodeJS.ReadableStream
  }

  /**
   * A boolean to find if the location path exists or not
   */
  public exists(location: string, options: BlobExistsOptions | any = {}): Promise<boolean> {
    try {
      return this.getBlockBlobClient(location).exists(options)
    } catch (error) {
      throw CannotGetMetaDataException.invoke(location, 'exists', error)
    }
  }

  /**
   * Returns the signed url for a given path
   */
  public async getSignedUrl(location: string, options?: BlobSASSignatureValues): Promise<string> {
    options = options || {
      containerName: this.config.container as string,
    }
    options.containerName = options.containerName || (this.config.container as string)

    try {
      const blockBlobClient = this.getBlockBlobClient(location)
      const SASUrl = await this.generateBlobSASURL(blockBlobClient, options)
      return SASUrl
    } catch (error) {
      throw CannotGetMetaDataException.invoke(location, 'signedUrl', error)
    }
  }

  /**
   * Returns URL to a given path
   */
  public async getUrl(location: string): Promise<string> {
    return unescape(this.getBlockBlobClient(location).url)
  }

  /**
   * Write string|buffer contents to a destination. The missing
   * intermediate directories will be created (if required).
   *
   * @todo look into returning the response of upload
   */
  public async put(
    location: string,
    contents: Buffer | string,
    options?: BlockBlobUploadOptions | undefined
  ): Promise<void> {
    const blockBlobClient = this.getBlockBlobClient(location)
    try {
      await blockBlobClient.upload(contents, contents.length, options)
    } catch (error) {
      throw CannotWriteFileException.invoke(location, error)
    }
  }

  /**
   * Write a stream to a destination. The missing intermediate
   * directories will be created (if required).
   */
  public async putStream(
    location: string,
    contents: ReadStream,
    options?: BlockBlobUploadStreamOptions
  ): Promise<void> {
    const blockBlobClient = this.getBlockBlobClient(location)

    try {
      await blockBlobClient.uploadStream(contents, undefined, undefined, options)
    } catch (error) {
      console.log(error)
      throw CannotWriteFileException.invoke(location, error)
    }
  }

  /**
   * Copy a given location path from the source to the desination.
   * The missing intermediate directories will be created (if required)
   *
   * @todo look into returning the response of syncCopyFromURL
   */
  public async copy(
    source: string,
    destination: string,
    options?: BlobSASSignatureValues
  ): Promise<void> {
    options = options || {
      containerName: this.config.container as string,
    }
    options.containerName = options.containerName || (this.config.container as string)

    const sourceBlockBlobClient = this.getBlockBlobClient(source)
    const destinationBlockBlobClient = this.getBlockBlobClient(destination)

    const url = await this.generateBlobSASURL(sourceBlockBlobClient, options)

    try {
      await destinationBlockBlobClient.syncCopyFromURL(url)
    } catch (error) {
      throw CannotCopyFileException.invoke(source, destination, error.original || error)
    }
  }

  /**
   * Remove a given location path
   *
   * @todo find a way to extend delete with BlobDeleteOptions
   */
  public async delete(location: string): Promise<void> {
    try {
      await this.getBlockBlobClient(location).delete()
    } catch (error) {
      throw CannotDeleteFileException.invoke(location, error)
    }
  }

  /**
   * Move a given location path from the source to the desination.
   * The missing intermediate directories will be created (if required)
   */
  public async move(
    source: string,
    destination: string,
    options?: BlobSASSignatureValues
  ): Promise<void> {
    try {
      await this.copy(source, destination, options)
      await this.delete(source)
    } catch (error) {
      throw CannotMoveFileException.invoke(source, destination, error.original || error)
    }
  }

  /**
   * Returns the file stats
   */
  public async getStats(location: string): Promise<DriveFileStats> {
    try {
      const metaData = await this.getBlockBlobClient(location).getProperties()

      return {
        modified: metaData.lastModified!,
        size: metaData.contentLength!,
        isFile: true,
        etag: metaData.etag,
      }
    } catch (error) {
      throw CannotGetMetaDataException.invoke(location, 'stats', error)
    }
  }

  /**
   * Not Supported
   *
   * Returns the file visibility
   *
   */
  public async getVisibility(location: string): Promise<Visibility> {
    throw CannotGetMetaDataException.invoke(location, 'visibility', 'Not Supported')
  }

  /**
   * Not supported
   *
   * Sets the file visibility
   */
  public async setVisibility(location: string): Promise<void> {
    throw CannotSetVisibilityException.invoke(location, 'Not Supported')
  }
}
