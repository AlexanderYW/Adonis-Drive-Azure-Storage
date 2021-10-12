'use strict'

import {
  CannotCopyFileException,
  CannotMoveFileException,
  CannotReadFileException,
  CannotWriteFileException,
  CannotDeleteFileException,
  CannotGetMetaDataException,
  CannotSetVisibilityException,
} from '@adonisjs/core/build/standalone'

import {
  Visibility,
  WriteOptions,
  ContentHeaders,
  DriveFileStats,
  DriverContract
  AzureStorageDriverConfig,
  AzureStorageDriverContract,
} from '@ioc:Adonis/Core/Drive'

import { promisify } from 'util'
import { PassThrough, pipeline } from 'stream'
import { string } from '@poppinss/utils/build/helpers'

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
  BlockBlobUploadStreamOptions
} from '@azure/storage-blob'

const pipelinePromise = promisify(pipeline)

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
    if (typeof this.config.connection_string !== 'undefined') {
      // eslint-disable-next-line
      this.adapter = BlobServiceClient.fromConnectionString(
        this.config.connection_string
      )
    } else {
      let credential
      if (
        this.config.azure_tenant_id &&
        this.config.azure_client_id &&
        this.config.azure_client_secret
      ) {
        credential = new DefaultAzureCredential()
      } else if (this.config.name && this.config.key) {
        credential = new StorageSharedKeyCredential(this.config.name, this.config.key)
      }

      let url = `https://${this.config.name}.blob.core.windows.net`

      if (typeof this.config.local_address !== 'undefined') {
        url = this.config.local_address
      }

      const azurePipeline = newPipeline(credential)

      this.adapter = new BlobServiceClient(url, azurePipeline)
    }

    // this._container = new Resetable(this.config.container)
  }

  /**
   * Transforms the write options to GCS properties. Checkout the
   * following example in the docs to see the available options
   *
   * https://googleapis.dev/nodejs/storage/latest/File.html#createWriteStream
   */
  private transformWriteOptions(options?: WriteOptions) {
    const {
      visibility,
      contentType,
      contentDisposition,
      contentEncoding,
      contentLanguage,
      ...adapterOptions
    } = Object.assign({ visibility: this.config.visibility }, options)

    adapterOptions.metadata = {}

    if (contentType) {
      adapterOptions['contentType'] = contentType
    }

    if (contentDisposition) {
      adapterOptions.metadata['contentDisposition'] = contentDisposition
    }

    if (contentEncoding) {
      adapterOptions.metadata['contentEncoding'] = contentEncoding
    }

    if (contentLanguage) {
      adapterOptions.metadata['contentLanguage'] = contentLanguage
    }

    return adapterOptions
  }

  /**
   * Converts ms expression to milliseconds
   */
  private msToTimeStamp(ms: string | number) {
    return new Date(Date.now() + string.toMs(ms)).getTime()
  }

  public getBlockBlobClient(location: string) {
    const container = this.config.container

    const containerClient = this.adapter.getContainerClient(container)
    return containerClient.getBlockBlobClient(location)
  }

  public async generateBlobSASURL(blockBlobClient, options: BlobSASSignatureValues): Promise<string> {
    options.permissions = options.permissions === null || typeof options.permissions === 'string' ? BlobSASPermissions.parse(options.permissions || 'r'): options.permissions

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

  /**
   * Returns the file contents as a buffer. The buffer return
   * value allows you to self choose the encoding when
   * converting the buffer to a string.
   */
  public async get(location: string, options: BlobDownloadToBufferOptions | any = {}): Promise<Buffer> {
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
    return (await this.getBlockBlobClient(location).download(0, 0, options)).readableStreamBody as NodeJS.ReadableStream
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
  public async getSignedUrl(location: string, options: BlobSASSignatureValues): Promise<string> {
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
  public async put(location: string, contents: Buffer | string, options: BlockBlobUploadOptions | undefined): Promise<void> {
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
  public async putStream(location: string, contents: NodeJS.ReadableStream, options?: BlockBlobUploadStreamOptions): Promise<void> {
    const blockBlobClient = this.getBlockBlobClient(location)

    try {
      const stream = new PassThrough()
      stream.write(contents)
      await blockBlobClient.uploadStream(stream, undefined, undefined, options)
      
    } catch (error) {
      throw CannotWriteFileException.invoke(location, error)
    }
  }

  /**
   * Copy a given location path from the source to the desination.
   * The missing intermediate directories will be created (if required)
   * 
   * @todo look into returning the response of syncCopyFromURL
   */
  public async copy(source: string, destination: string, options: BlobSASSignatureValues): Promise<void> {
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
  public async move(source: string, destination: string, options: BlobSASSignatureValues): Promise<void> {
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
