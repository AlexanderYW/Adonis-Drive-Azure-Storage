/*
 * adonis-drive-azure-storage
 *
 * (c) Alexander Wennerstrøm <alexanderw0310@gmail.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import test from 'japa'
import { join } from 'path'
import { Filesystem } from '@poppinss/dev-utils'
import { string } from '@poppinss/utils/build/helpers'

import { AzureStorageDriver } from '../src/Drivers'
import { AZURE_CONTAINER, authenticationOptions } from '../test-helpers'
import { AzureStorageDriverConfig } from '@ioc:Adonis/Core/Drive'

const fs = new Filesystem(join(__dirname, '__app'))

test.group('Azure Storage driver | createContainer', () => {
  test('create container', async (assert) => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const driver = new AzureStorageDriver(config)
    await driver.createContainer(AZURE_CONTAINER)

    assert.isTrue(await driver.existsContainer(AZURE_CONTAINER))

    await driver.deleteContainer(AZURE_CONTAINER)
  }).timeout(0)
})

test.group('Azure Storage driver | deleteContainer', () => {
  test('delete container', async (assert) => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const driver = new AzureStorageDriver(config)
    await driver.createContainer(AZURE_CONTAINER)

    await driver.deleteContainer(AZURE_CONTAINER)

    assert.isFalse(await driver.existsContainer(AZURE_CONTAINER))
  }).timeout(0)
})

test.group('Azure Storage driver | put', (group) => {
  group.beforeEach(async () => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const driver = new AzureStorageDriver(config)
    await driver.createContainer(AZURE_CONTAINER)
  })
  group.afterEach(async () => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const driver = new AzureStorageDriver(config)
    await driver.deleteContainer(AZURE_CONTAINER)
  })
  test('write file to the destination', async (assert) => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`

    const driver = new AzureStorageDriver(config)

    await driver.put(fileName, 'hello world')
    await driver.getUrl(fileName)

    const contents = await driver.get(fileName)
    assert.equal(contents.toString(), 'hello world')

    await driver.delete(fileName)
  }).timeout(0)

  test('write to nested path', async (assert) => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const fileName = `bar/baz/${string.generateRandom(10)}.txt`

    const driver = new AzureStorageDriver(config)
    await driver.put(fileName, 'hello world')

    const contents = await driver.get(fileName)
    assert.equal(contents.toString(), 'hello world')

    await driver.delete(fileName)
  }).timeout(0)

  test('overwrite destination when already exists', async (assert) => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const fileName = `bar/baz/${string.generateRandom(10)}.txt`

    const driver = new AzureStorageDriver(config)
    await driver.put(fileName, 'hello world')
    await driver.put(fileName, 'hi world')

    const contents = await driver.get(fileName)
    assert.equal(contents.toString(), 'hi world')

    await driver.delete(fileName)
  }).timeout(0)

  test('set custom content-type for the file', async (assert) => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`

    const driver = new AzureStorageDriver(config)

    await driver.put(fileName, '{ "hello": "world" }', {
      metadata: { contentType: 'application/json' },
      blobHTTPHeaders: { blobContentType: 'application/json' },
    })
    const metaData = await driver.adapter
      .getContainerClient(AZURE_CONTAINER)
      .getBlockBlobClient(fileName)
      .getProperties()

    assert.equal(metaData.contentType, 'application/json')

    await driver.delete(fileName)
  }).timeout(0)
})

test.group('Azure Storage driver | putStream', (group) => {
  group.beforeEach(async () => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const driver = new AzureStorageDriver(config)
    await driver.createContainer(AZURE_CONTAINER)
  })
  group.afterEach(async () => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const driver = new AzureStorageDriver(config)
    await driver.deleteContainer(AZURE_CONTAINER)
    await fs.cleanup()
  })

  test('write file to the destination', async (assert) => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`

    const driver = new AzureStorageDriver(config)
    await fs.add('foo.txt', 'hello stream')
    const stream = fs.fsExtra.createReadStream(join(fs.basePath, 'foo.txt'))
    await driver.putStream(fileName, stream)

    const contents = await driver.get(fileName)
    assert.equal(contents.toString(), 'hello stream')

    await driver.delete(fileName)
  }).timeout(0)

  test('write to nested path', async (assert) => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const fileName = `bar/baz/${string.generateRandom(10)}.txt`

    const driver = new AzureStorageDriver(config)
    await fs.add('foo.txt', 'hello stream')
    const stream = fs.fsExtra.createReadStream(join(fs.basePath, 'foo.txt'))
    await driver.putStream(fileName, stream)

    const contents = await driver.get(fileName)
    assert.equal(contents.toString(), 'hello stream')

    await driver.delete(fileName)
  }).timeout(0)

  test('overwrite destination when already exists', async (assert) => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const fileName = `bar/baz/${string.generateRandom(10)}.txt`

    const driver = new AzureStorageDriver(config)
    await fs.add('foo.txt', 'hi stream')
    const stream = fs.fsExtra.createReadStream(join(fs.basePath, 'foo.txt'))
    await driver.put(fileName, 'hello world')
    await driver.putStream(fileName, stream)

    const contents = await driver.get(fileName)
    assert.equal(contents.toString(), 'hi stream')

    await driver.delete(fileName)
  }).timeout(0)

  test('set custom content-type for the file', async (assert) => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`

    const driver = new AzureStorageDriver(config)
    await fs.add('foo.txt', '{ "hello": "world" }')
    const stream = fs.fsExtra.createReadStream(join(fs.basePath, 'foo.txt'))
    await driver.putStream(fileName, stream, {
      metadata: { contentType: 'application/json' },
      blobHTTPHeaders: { blobContentType: 'application/json' },
    })

    const metaData = await driver.adapter
      .getContainerClient(AZURE_CONTAINER)
      .getBlockBlobClient(fileName)
      .getProperties()

    assert.equal(metaData.contentType, 'application/json')

    await driver.delete(fileName)
  }).timeout(0)
})

test.group('Azure Storage driver | exists', (group) => {
  group.beforeEach(async () => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const driver = new AzureStorageDriver(config)
    await driver.createContainer(AZURE_CONTAINER)
  })
  group.afterEach(async () => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const driver = new AzureStorageDriver(config)
    await driver.deleteContainer(AZURE_CONTAINER)
  })
  test('return true when a file exists', async (assert) => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const fileName = `bar/baz/${string.generateRandom(10)}.txt`

    const driver = new AzureStorageDriver(config)

    await driver.put(fileName, 'bar')
    assert.isTrue(await driver.exists(fileName))

    await driver.delete(fileName)
  }).timeout(0)

  test("return false when a file doesn't exists", async (assert) => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`

    const driver = new AzureStorageDriver(config)
    assert.isFalse(await driver.exists(fileName))
  }).timeout(0)

  test("return false when a file parent directory doesn't exists", async (assert) => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const fileName = `bar/baz/${string.generateRandom(10)}.txt`

    const driver = new AzureStorageDriver(config)
    assert.isFalse(await driver.exists(fileName))
  }).timeout(0)

  test('raise exception when connection string credentials are incorrect', async (assert) => {
    assert.plan(1)

    const config: AzureStorageDriverConfig = {
      connection_string:
        'DefaultEndpointsProtocol=https;AccountKey=<account-key>;EndpointSuffix=core.windows.net',
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }

    try {
      const driver = new AzureStorageDriver(config)
      await driver.exists('bar/baz/foo.txt')
    } catch (error) {
      assert.match(error, /Invalid AccountName in the provided Connection String/)
    }
  }).timeout(0)
})

test.group('Azure Storage driver | delete', (group) => {
  group.beforeEach(async () => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const driver = new AzureStorageDriver(config)
    await driver.createContainer(AZURE_CONTAINER)
  })
  group.afterEach(async () => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const driver = new AzureStorageDriver(config)
    await driver.deleteContainer(AZURE_CONTAINER)
    await fs.cleanup()
  })

  test('remove file', async (assert) => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`

    const driver = new AzureStorageDriver(config)
    await driver.put(fileName, 'bar')
    await driver.delete(fileName)

    assert.isFalse(await driver.exists(fileName))
  }).timeout(0)
})

test.group('Azure Storage driver | copy', (group) => {
  group.beforeEach(async () => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const driver = new AzureStorageDriver(config)
    await driver.createContainer(AZURE_CONTAINER)
  })
  group.afterEach(async () => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const driver = new AzureStorageDriver(config)
    await driver.deleteContainer(AZURE_CONTAINER)
    await fs.cleanup()
  })

  test('copy file from within the disk root', async (assert) => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`
    const fileName1 = `${string.generateRandom(10)}.txt`

    const driver = new AzureStorageDriver(config)

    await driver.put(fileName, 'hello world')
    await driver.copy(fileName, fileName1)

    const contents = await driver.get(fileName1)
    assert.equal(contents.toString(), 'hello world')

    await driver.delete(fileName)
    await driver.delete(fileName1)
  }).timeout(0)

  test('create intermediate directories when copying a file', async (assert) => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`
    const fileName1 = `baz/${string.generateRandom(10)}.txt`

    const driver = new AzureStorageDriver(config)

    await driver.put(fileName, 'hello world')
    await driver.copy(fileName, fileName1)

    const contents = await driver.get(fileName1)
    assert.equal(contents.toString(), 'hello world')

    await driver.delete(fileName)
    await driver.delete(fileName1)
  }).timeout(0)

  test("return error when source doesn't exists", async (assert) => {
    assert.plan(1)

    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }

    const driver = new AzureStorageDriver(config)

    try {
      await driver.copy('foo.txt', 'bar.txt')
    } catch (error) {
      assert.equal(
        error.message,
        'E_CANNOT_COPY_FILE: Cannot copy file from "foo.txt" to "bar.txt"'
      )
    }
  }).timeout(0)

  test('overwrite destination when already exists', async (assert) => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`
    const fileName1 = `${string.generateRandom(10)}.txt`

    const driver = new AzureStorageDriver(config)

    await driver.put(fileName, 'hello world')
    await driver.put(fileName1, 'hi world')
    await driver.copy(fileName, fileName1)

    const contents = await driver.get(fileName1)
    assert.equal(contents.toString(), 'hello world')

    await driver.delete(fileName)
    await driver.delete(fileName1)
  }).timeout(0)

  test('retain source content-type during copy', async (assert) => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`
    const fileName1 = `${string.generateRandom(10)}.txt`

    const driver = new AzureStorageDriver(config)

    await driver.put(fileName, 'hello world', {
      metadata: { contentType: 'application/json' },
      blobHTTPHeaders: { blobContentType: 'application/json' },
    })
    await driver.copy(fileName, fileName1)

    const metaData = await driver.adapter
      .getContainerClient(AZURE_CONTAINER)
      .getBlockBlobClient(fileName)
      .getProperties()

    assert.equal(metaData.contentType, 'application/json')

    await driver.delete(fileName)
    await driver.delete(fileName1)
  }).timeout(0)
})

test.group('Azure Storage driver | move', (group) => {
  group.beforeEach(async () => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const driver = new AzureStorageDriver(config)
    await driver.createContainer(AZURE_CONTAINER)
  })
  group.afterEach(async () => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const driver = new AzureStorageDriver(config)
    await driver.deleteContainer(AZURE_CONTAINER)
    await fs.cleanup()
  })

  test('move file from within the disk root', async (assert) => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`
    const fileName1 = `${string.generateRandom(10)}.txt`

    const driver = new AzureStorageDriver(config)

    await driver.put(fileName, 'hello world')
    await driver.move(fileName, fileName1)

    const contents = await driver.get(fileName1)
    assert.equal(contents.toString(), 'hello world')
    assert.isFalse(await driver.exists(fileName))

    await driver.delete(fileName1)
  }).timeout(0)

  test('create intermediate directories when moving a file', async (assert) => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`
    const fileName1 = `baz/${string.generateRandom(10)}.txt`

    const driver = new AzureStorageDriver(config)

    await driver.put(fileName, 'hello world')
    await driver.move(fileName, fileName1)

    const contents = await driver.get(fileName1)
    assert.equal(contents.toString(), 'hello world')
    assert.isFalse(await driver.exists(fileName))

    await driver.delete(fileName1)
  }).timeout(0)

  test("return error when source doesn't exists", async (assert) => {
    assert.plan(1)

    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }

    const driver = new AzureStorageDriver(config)

    try {
      await driver.move('foo.txt', 'baz/bar.txt')
    } catch (error) {
      assert.equal(
        error.message,
        'E_CANNOT_MOVE_FILE: Cannot move file from "foo.txt" to "baz/bar.txt"'
      )
    }
  }).timeout(0)

  test('overwrite destination when already exists', async (assert) => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`
    const fileName1 = `baz/${string.generateRandom(10)}.txt`

    const driver = new AzureStorageDriver(config)

    await driver.put(fileName, 'hello world')
    await driver.put(fileName1, 'hi world')

    await driver.move(fileName, fileName1)

    const contents = await driver.get(fileName1)
    assert.equal(contents.toString(), 'hello world')

    await driver.delete(fileName1)
  }).timeout(0)

  test('retain source content-type during move', async (assert) => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`
    const fileName1 = `${string.generateRandom(10)}.txt`

    const driver = new AzureStorageDriver(config)

    await driver.put(fileName, 'hello world', {
      metadata: { contentType: 'application/json' },
      blobHTTPHeaders: { blobContentType: 'application/json' },
    })
    await driver.move(fileName, fileName1)

    const metaData = await driver.getBlockBlobClient(fileName1).getProperties()

    assert.equal(metaData.contentType, 'application/json')

    await driver.delete(fileName1)
  }).timeout(0)
})

test.group('Azure Storage driver | get', (group) => {
  group.beforeEach(async () => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const driver = new AzureStorageDriver(config)
    await driver.createContainer(AZURE_CONTAINER)
  })
  group.afterEach(async () => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const driver = new AzureStorageDriver(config)
    await driver.deleteContainer(AZURE_CONTAINER)
    await fs.cleanup()
  })

  test('get file contents', async (assert) => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`

    const driver = new AzureStorageDriver(config)
    await driver.put(fileName, 'hello world')

    const contents = await driver.get(fileName)
    assert.equal(contents.toString(), 'hello world')

    await driver.delete(fileName)
  }).timeout(0)

  test('get file contents as a stream', async (assert, done) => {
    assert.plan(1)

    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`

    const driver = new AzureStorageDriver(config)
    await driver.put(fileName, 'hello world')

    const stream = await driver.getStream(fileName)

    stream.on('data', (chunk) => {
      assert.equal(chunk, 'hello world')
    })
    stream.on('end', async () => {
      await driver.delete(fileName)
      done()
    })
    stream.on('error', (error) => {
      done(error)
    })
  }).timeout(0)

  test("return error when file doesn't exists", async (assert) => {
    assert.plan(1)
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }

    const driver = new AzureStorageDriver(config)

    try {
      await driver.get('foo.txt')
    } catch (error) {
      assert.equal(error.message, 'E_CANNOT_READ_FILE: Cannot read file from location "foo.txt"')
    }
  }).timeout(0)
})

test.group('Azure Storage driver | getStats', (group) => {
  group.beforeEach(async () => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const driver = new AzureStorageDriver(config)
    await driver.createContainer(AZURE_CONTAINER)
  })
  group.afterEach(async () => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const driver = new AzureStorageDriver(config)
    await driver.deleteContainer(AZURE_CONTAINER)
    await fs.cleanup()
  })

  test('get file stats', async (assert) => {
    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }
    const fileName = `${string.generateRandom(10)}.txt`

    const driver = new AzureStorageDriver(config)
    await driver.put(fileName, 'hello world')

    const stats = await driver.getStats(fileName)
    assert.equal(stats.size, 11)
    assert.instanceOf(stats.modified, Date)

    await driver.delete(fileName)
  }).timeout(0)

  test('return error when file is missing', async (assert) => {
    assert.plan(1)

    const config: AzureStorageDriverConfig = {
      ...authenticationOptions,
      container: AZURE_CONTAINER,
      driver: 'AzureStorage' as const,
    }

    const driver = new AzureStorageDriver(config)
    const fileName = `${string.generateRandom(10)}.txt`

    try {
      await driver.getStats(fileName)
    } catch (error) {
      assert.equal(
        error.message,
        `E_CANNOT_GET_METADATA: Unable to retrieve the "stats" for file at location "${fileName}"`
      )
    }
  }).timeout(0)
})
