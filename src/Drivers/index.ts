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
import { pipeline, Readable } from 'stream'
import { string } from '@poppinss/utils/build/helpers'

import { DefaultAzureCredential } from '@azure/identity'
import {
  newPipeline,
  BlobServiceClient,
  StorageSharedKeyCredential,
  BlobDownloadOptions,
  BlobDownloadToBufferOptions,
  BlobExistsOptions,
} from '@azure/storage-blob'

/*
  BlobServiceClient,
  newPipeline,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  BlobItem,
*/

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
    return (await this.getBlockBlobClient(location).download(0, 0, options)).readableStreamBody
  }
}
