'use strict'

import { DefaultAzureCredential } from '@azure/identity'
import {
  BlobServiceClient,
  newPipeline,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  BlobItem,
} from '@azure/storage-blob'

import Resetable from 'resetable'

export interface Config {
  connection_string?: string;
  azure_tenant_id?: string;
  azure_client_id?: string;
  azure_client_secret?: string;
  driver?: string;
  name?: string;
  key?: string;
  local_address?: string;
  container?: string
}

export default class AzureStorage {
  private AzureClient: BlobServiceClient
  private _container: Resetable
  constructor (protected config: Config) {
    if (typeof config.connection_string !== 'undefined') {
      // eslint-disable-next-line
      this.AzureClient = BlobServiceClient.fromConnectionString(
        config.connection_string
      )
    } else {
      let credential
      if (
        config.azure_tenant_id &&
        config.azure_client_id &&
        config.azure_client_secret
      ) {
        credential = new DefaultAzureCredential()
      } else if (config.name && config.key) {
        credential = new StorageSharedKeyCredential(config.name, config.key)
      }

      let url = `https://${config.name}.blob.core.windows.net`

      if (typeof config.local_address !== 'undefined') {
        url = config.local_address
      }

      const pipeline = newPipeline(credential)

      this.AzureClient = new BlobServiceClient(url, pipeline)
    }

    this._container = new Resetable(config.container)
  }

  public getBlockBlobClient (relativePath: string) {
    const container = this._container.pull()

    const containerClient = this.AzureClient.getContainerClient(container)
    return containerClient.getBlockBlobClient(relativePath)
  }

  public container (container: string) {
    this._container.set(container)
    return this
  }

  public existsContainer (container: string, options: any = {}) {
    const containerClient = this.AzureClient.getContainerClient(container)
    return new Promise((resolve, reject) => {
      try {
        containerClient.exists(options).then(containerResult => {
          resolve(containerResult)
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  public createContainer (container: string, options: any = {}) {
    const containerClient = this.AzureClient.getContainerClient(container)
    return new Promise((resolve, reject) => {
      try {
        containerClient.create(options).then(containerResult => {
          this._container.set(containerResult)
          resolve(containerResult)
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  public deleteContainer (container: string, options: any = {}) {
    const containerClient = this.AzureClient.getContainerClient(container)
    return new Promise((resolve, reject) => {
      try {
        containerClient.delete(options).then(containerResult => {
          resolve(containerResult)
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * List all files within vitual folder if specified
   * If nothing is specified, root files within container will be listed
   * Disclaimer: Doesn't list virtual folders
   */
  public async list (prefix: string = '', options: any = {}) {
    if (prefix !== null && prefix !== undefined && prefix !== '') {
      options.prefix = prefix
    }

    const container = this._container.pull()
    const containerClient = this.AzureClient.getContainerClient(container)
    // const listBlobsResponse = await containerClient.listBlobsByHierarchy('/', options)
    const blobs : BlobItem[] = []
    for await (const item of containerClient.listBlobsByHierarchy('/', options)) {
      if (item.kind !== 'prefix') {
        blobs.push(item)
      }
    }
    return blobs
  }

  public exists (relativePath: string, options: any = {}) {
    const blockBlobClient = this.getBlockBlobClient(relativePath)

    return new Promise((resolve, reject) => {
      try {
        blockBlobClient.exists(options).then(exists => {
          resolve(exists)
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  public put (relativePath: string, content: any, options: any = {}) {
    const blockBlobClient = this.getBlockBlobClient(relativePath)

    return new Promise((resolve, reject) => {
      try {
        blockBlobClient.upload(content, content.length, options).then(response => {
          resolve(response)
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  public putStream (relativePath: string, content: any) {
    const blockBlobClient = this.getBlockBlobClient(relativePath)

    return new Promise((resolve, reject) => {
      try {
        blockBlobClient.uploadStream(content, content.length).then(response => {
          resolve(response)
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  public delete (relativePath: string, options: any = {}) {
    const blockBlobClient = this.getBlockBlobClient(relativePath)

    return new Promise((resolve, reject) => {
      try {
        blockBlobClient.delete(options).then(exists => {
          resolve(exists)
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  public get (relativePath: string, options: any = {}) {
    const blockBlobClient = this.getBlockBlobClient(relativePath)

    return new Promise((resolve, reject) => {
      try {
        blockBlobClient.downloadToBuffer(0, 0, options).then(file => {
          resolve(file)
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  public getStream (relativePath: string, options: any = {}) {
    const blockBlobClient = this.getBlockBlobClient(relativePath)

    return new Promise((resolve, reject) => {
      try {
        blockBlobClient.download(0, 0, options).then(file => {
          resolve(file)
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  public async move (relativeSrcPath: string, relativeDestPath: string, options: any = {}) {
    const srcContainer = this._container.get()
    await this.copy(relativeSrcPath, relativeDestPath, options)
    return this.container(srcContainer).delete(relativeSrcPath)
  }

  public async copy (relativeSrcPath: string, relativeDestPath: string, options: any = {}) {
    const container = this._container.pull()
    options.destContainer = options.destContainer || container

    const srcBlockBlobClient = this.getBlockBlobClient(relativeSrcPath)
    const destBlockBlobClient = this.getBlockBlobClient(relativeDestPath)

    const url = await this.generateBlobSASURL(srcBlockBlobClient)

    try {
      return await destBlockBlobClient.syncCopyFromURL(url)
    } catch (err) {
      return err
    }
  }

  public async generateBlobSASURL (blockBlobClient, options: any = {}) {
    options.permissions = options.permissions || 'r'

    options.expiry = options.expiry || 3600
    options.startsOn = options.startsOn || new Date()
    options.expiresOn =
      options.expiresOn ||
      new Date(options.startsOn.valueOf() + options.expiry * 1000)

    const blobSAS = await generateBlobSASQueryParameters(
      {
        containerName: blockBlobClient.containerName, // Required
        blobName: blockBlobClient.location, // Required
        permissions: BlobSASPermissions.parse(options.permissions), // Required
        startsOn: options.startsOn,
        expiresOn: options.expiresOn,
      },
      blockBlobClient.credential
    )

    return `${blockBlobClient.url}?${blobSAS.toString()}`
  }

  public async getSignedUrl (relativePath: string, options: any = {}) {
    const blockBlobClient = this.getBlockBlobClient(relativePath)
    const SASUrl = await this.generateBlobSASURL(blockBlobClient, options)
    return SASUrl
  }

  public getUrl (relativePath: string) {
    const blockBlobClient = this.getBlockBlobClient(relativePath)

    return unescape(blockBlobClient.url)
  }
}
