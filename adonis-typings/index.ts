/*
 * @adonisjs/drive-gcs
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare module '@ioc:Adonis/Core/Drive' {
  import { CommonOptions, BlobServiceClient } from '@azure/storage-blob'

  /**
   * Configuration accepted by the gcs driver
   */
  export type AzureStorageDriverConfig = CommonOptions & {
    driver: 'AzureStorage'
    connection_string?: string
    azure_tenant_id?: string
    azure_client_id?: string
    azure_client_secret?: string
    name?: string
    key?: string
    local_address?: string
    container?: string
  }

  /**
   * The Azure Storage driver implementation interface
   */
  export interface AzureStorageDriverContract extends DriverContract {
    name: 'AzureStorage'
    adapter: BlobServiceClient
  }
}
