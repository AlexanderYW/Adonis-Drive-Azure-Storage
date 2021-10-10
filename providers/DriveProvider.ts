'use strict'

// const { ServiceProvider } = require('@adonisjs/fold')
// const AzureStorage = require('../src/Drivers')
// import { ApplicationContract } from '@ioc:Adonis/Core/Application'
import { ServiceProvider } from '@adonisjs/fold'
import AzureStorage from '../src/Drivers'

/* class DriverProvider extends ServiceProvider {
  register () {
    this.app.extend('Adonis/Addons/Drive', 'azure', () => {
      return AzureStorage
    })
  }
} */

// export default class DriverProvider extends ServiceProvider {
export default class DriverProvider {
  public static needsApplication = true
  constructor (protected app: ServiceProvider) {}

  public register (): void {
    /* this.app.container.singleton('Adonis/Addons/LucidFilter', () => ({
      filterable,
      BaseModelFilter,
    })) */
    this.app.extend('Adonis/Addons/Drive', 'azure', () => {
      return AzureStorage
    })
  }
}
