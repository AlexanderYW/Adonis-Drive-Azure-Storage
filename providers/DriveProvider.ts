'use strict'

/*
 * adonis-drive-azure-storage
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { ApplicationContract } from '@ioc:Adonis/Core/Application'

export default class AzureStorageProvider {
  constructor(protected app: ApplicationContract) {}

  public boot() {
    this.app.container.withBindings(['Adonis/Core/Drive'], (Drive) => {
      Drive.extend('AzureStorage', (_, __, config) => {
        const { AzureStorageDriver } = require('../src/Drivers')
        return new AzureStorageDriver(config)
      })
    })
  }
}
