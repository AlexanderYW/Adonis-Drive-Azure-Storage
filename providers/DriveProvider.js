'use strict'

const { ServiceProvider } = require('@adonisjs/fold')
const AzureStorage = require('../src/Drivers')

class DriverProvider extends ServiceProvider {
  register () {
    this.app.extend('Adonis/Addons/Drive', 'azure', () => {
      return AzureStorage
    })
  }
}

module.exports = DriverProvider
