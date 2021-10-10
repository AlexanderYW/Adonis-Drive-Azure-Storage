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
}
