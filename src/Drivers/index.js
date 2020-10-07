'use strict'

const { DefaultAzureCredential } = require('@azure/identity')
const {
  BlobServiceClient,
  newPipeline,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions
} = require('@azure/storage-blob')
const Resetable = require('resetable')

class AzureStorage {
  constructor (config) {
    if (typeof config.connection_string !== 'undefined') {
      // eslint-disable-next-line
      this.AzureClient = new BlobServiceClient.fromConnectionString(
        config.connection_string
      )
    } else {
      let credential = null
      if (
        config.azure_tenant_id &&
        config.azure_client_id &&
        config.azure_client_secret
      ) {
        credential = new DefaultAzureCredential()
      } else {
        credential = new StorageSharedKeyCredential(config.name, config.key)
      }

      var url = `https://${config.name}.blob.core.windows.net`

      if (typeof config.local_address !== 'undefined') {
        url = config.local_address
      }

      const pipeline = newPipeline(credential)

      this.AzureClient = new BlobServiceClient(url, pipeline)
    }

    this._container = new Resetable(config.container)
  }

  getBlockBlobClient (relativePath) {
    const container = this._container.pull()

    const containerClient = this.AzureClient.getContainerClient(container)
    return containerClient.getBlockBlobClient(relativePath)
  }

  container (container) {
    this._container.set(container)
    return this
  }

  existsContainer (container) {
    const containerClient = this.AzureClient.getContainerClient(container)
    return new Promise((resolve, reject) => {
      containerClient.exists().then(container => {
        resolve(container)
      })
    })
  }

  createContainer (container) {
    const containerClient = this.AzureClient.getContainerClient(container)
    return new Promise((resolve, reject) => {
      containerClient.create().then(container => {
        this._container.set(container)
        resolve(container)
      })
    })
  }

  deleteContainer (container) {
    const containerClient = this.AzureClient.getContainerClient(container)
    return new Promise((resolve, reject) => {
      containerClient.delete().then(container => {
        resolve(container)
      })
    })
  }

  exists (relativePath) {
    const blockBlobClient = this.getBlockBlobClient(relativePath)

    return new Promise((resolve, reject) => {
      blockBlobClient.exists().then(exists => {
        resolve(exists)
      })
    })
  }

  put (relativePath, content) {
    const blockBlobClient = this.getBlockBlobClient(relativePath)

    return new Promise((resolve, reject) => {
      try {
        blockBlobClient.upload(content, content.length).then(response => {
          resolve(response)
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  putStream (relativePath, content) {
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

  delete (relativePath) {
    const blockBlobClient = this.getBlockBlobClient(relativePath)

    return new Promise((resolve, reject) => {
      try {
        blockBlobClient.delete().then(exists => {
          resolve(exists)
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  get (relativePath) {
    const blockBlobClient = this.getBlockBlobClient(relativePath)

    return new Promise((resolve, reject) => {
      try {
        blockBlobClient.downloadToBuffer(0).then(file => {
          resolve(file)
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  getStream (relativePath) {
    const blockBlobClient = this.getBlockBlobClient(relativePath)

    return new Promise((resolve, reject) => {
      try {
        blockBlobClient.download(0).then(file => {
          resolve(file)
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  async move (relativeSrcPath, relativeDestPath, options = {}) {
    const srcContainer = this._container.get()
    await this.copy(relativeSrcPath, relativeDestPath, options)
    return this.container(srcContainer).delete(relativeSrcPath)
  }

  async copy (relativeSrcPath, relativeDestPath, options = {}) {
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

  async generateBlobSASURL (blockBlobClient, options = {}) {
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
        expiresOn: options.expiresOn
      },
      blockBlobClient.credential
    )

    return `${blockBlobClient.url}?${blobSAS.toString()}`
  }

  async getSignedUrl (relativePath, options = {}) {
    const blockBlobClient = this.getBlockBlobClient(relativePath)
    const SASUrl = await this.generateBlobSASURL(blockBlobClient, options)
    return SASUrl
  }

  getUrl (relativePath) {
    const blockBlobClient = this.getBlockBlobClient(relativePath)

    return blockBlobClient.url
  }
}

module.exports = AzureStorage
