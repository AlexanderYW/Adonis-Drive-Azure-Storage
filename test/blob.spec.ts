'use strict'

import test from 'japa'
import AzureClient from '../src/Drivers'

const config = {
  driver: 'azure',
  container: 'adonis-driver-test',
  connection_string: 'UseDevelopmentStorage=true',
}
const containerString = `http://127.0.0.1:10000/devstoreaccount1/${config.container}`

function bodyToString (response: any) {
  return new Promise((resolve, reject) => {
    response.readableStreamBody.on('readable', (length: any) => {
      const chunk = response.readableStreamBody.read(length)
      if (chunk) {
        resolve(chunk.toString())
      }
    })
    response.readableStreamBody.on('error', reject)
  })
}

test.group('Blob storage testing', (group) => {
  group.before(async () => {
    const client = new AzureClient(config)

    if (!await client.existsContainer(config.container)) {
      await client.createContainer(config.container)
    }
  })

  test('List files in empty root', async (assert) => {
    const client = new AzureClient(config)

    assert.isAtLeast((await client.list()).length, 0)
  })

  test('Create hello.txt file', async (assert) => {
    const client = new AzureClient(config)

    await client.put('hello.txt', Buffer.from('Hello world!'))

    assert.equal(await client.exists('hello.txt'), true)
  })

  test('Create hello.txt file in folder', async (assert) => {
    const client = new AzureClient(config)

    const filePath = 'folder/hello.txt'

    await client.put(filePath, Buffer.from('Hello world!'))

    assert.equal(await client.exists(filePath), true)
    assert.equal(await client.getUrl(filePath), `${containerString}/${filePath}`) // Checking url is unescaped
  })

  test('Create hello.txt file using Stream', async (assert) => {
    const client = new AzureClient(config)
    const { Readable } = require('stream')
    const buffer = Buffer.from('Hello world!')
    const readable = new Readable()
    readable._read = () => {} // _read is required but you can noop it
    readable.push(buffer)
    readable.push(null)

    await client.putStream('hello-stream.txt', readable)

    assert.equal(await client.exists('hello-stream.txt'), true)
  })

  test('Check if file exists', async (assert) => {
    const client = new AzureClient(config)

    assert.equal(await client.exists('hello.txt'), true)
  })

  test('Get hello.txt file', async (assert) => {
    const client = new AzureClient(config)

    assert.equal(await client.get('hello.txt'), 'Hello world!')
  })

  test('Get hello.txt file as stream', async (assert) => {
    const client = new AzureClient(config)

    assert.equal(await bodyToString(await client.getStream('hello.txt')), 'Hello world!')
  })

  // Disabled until next version of Azurite is released
  test('Move hello.txt file', async (assert) => {
    const client = new AzureClient(config)

    await client.move('hello.txt', 'hello-moved.txt')

    assert.equal(await client.exists('hello-moved.txt'), true)
  })

  test('Copy hello.txt file', async (assert) => {
    const client = new AzureClient(config)

    await client.copy('hello-moved.txt', 'hello.txt')

    assert.equal(await client.exists('hello.txt'), true)
  })

  test('List files in root', async (assert) => {
    const client = new AzureClient(config)

    assert.isAtLeast((await client.list()).length, 1)
  })

  test('List files in folder', async (assert) => {
    const client = new AzureClient(config)

    const folderPath = 'folder/'

    assert.isAtLeast((await client.list(folderPath)).length, 1)
  })

  test('List files in non-existing folder', async (assert) => {
    const client = new AzureClient(config)

    const folderPath = 'fake/'

    assert.isAtLeast((await client.list(folderPath)).length, 0)
  })

  test('Delete all created files (Clean up)', async (assert) => {
    const client = new AzureClient(config)

    await client.delete('hello.txt')
    await client.delete('hello-moved.txt')
    await client.delete('hello-stream.txt')
    await client.delete('folder/hello.txt')

    const doesExists = await client.exists('hello.txt') &&
      await client.exists('hello-moved.txt') &&
      await client.exists('hello-stream.txt') &&
      await client.exists('folder/hello.txt')

    assert.equal(doesExists, false)
  })

  group.after(async () => {
    const client = new AzureClient(config)

    await client.deleteContainer(config.container)
  })
})