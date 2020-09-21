# Adonis Drive - Azure Storage (blob)

[![image](https://img.shields.io/npm/dm/adonis-drive-azure-storage.svg)](https://www.npmjs.com/package/adonis-drive-azure-storage)
[![image](https://img.shields.io/npm/v/adonis-drive-azure-storage.svg)](https://www.npmjs.com/package/adonis-drive-azure-storage)
[![image](https://img.shields.io/npm/l/adonis-drive-azure-storage.svg)](https://github.com/AlexanderYW/Adonis-Drive-Azure-Storage/blob/master/LICENSE)
[![CodeQL](https://github.com/AlexanderYW/Adonis-Drive-Azure-Storage/workflows/CodeQL/badge.svg)](https://github.com/AlexanderYW/Adonis-Drive-Azure-Storage/actions?query=workflow%3ACodeQL)
[![Node.js Package](https://github.com/AlexanderYW/Adonis-Drive-Azure-Storage/workflows/Node.js%20Package/badge.svg)](https://github.com/AlexanderYW/Adonis-Drive-Azure-Storage/actions?query=workflow%3A%22Node.js+Package%22)

## Requirements 📦
Adonis Drive
```sh
adonis install @adonisjs/drive
````

Azure Storage driver
```sh
npm install adonis-drive-azure-storage --save
```

## Setup ✏
Register the provider inside `start/app.js` file along with `@adonisjs/drive` provider
```javascript
const providers = [
    ...
    '@adonisjs/drive/providers/DriveProvider',
    'adonis-drive-azure-storage/providers/DriveProvider'
]
```

Add the driver configuration inside `disks` module in `config/drive.js`

```javascript
/*
|--------------------------------------------------------------------------
| Azure
|--------------------------------------------------------------------------
|
| Azure disk interacts with a container on Azure blob storage
|
*/
azure: {
  driver: 'azure', // Required
  container: Env.get('AZURE_CONTAINER') // Required

  // There is 4 diffent way to connect to blob storage shown below

  // 1. Either SAS or use `UseDevelopmentStorage=true` for local development
  connection_string: Env.get('AZURE_CONNECTION_STRING'),

  // 2. Remote storage emulator
  key: Env.get('AZURE_KEY'), // Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==
  name: Env.get('AZURE_SECRET'), // devstoreaccount1
  // local_address below is used to find the remote emulator
  local_address: Env.get('AZURE_LOCAL_ADDRESS'), // 'http://192.168.0.2:10000/devstoreaccount1'

  // 3. Azure blob storage
  key: Env.get('AZURE_KEY'),
  name: Env.get('AZURE_SECRET'),

  // 4. Azure AD (Not tested, might work, no promise)
  azure_tenant_id: Env.get('AZURE_TENANT_ID'),
  azure_client_id: Env.get('AZURE_CLIENT_ID'),
  azure_client_secret: Env.get('AZURE_CLIENT_SECRET'),
}
```

Add variables inside the `.env` file

## Documentation 📝

#### exists(relativePath)
returns `boolean`
```javascript
const exists = await Drive.disk('azure').exists('unicorn.jpg')
```

#### get(relativePath)
returns file as `buffer`
```javascript
const buffer = await Drive.disk('azure').get('unicorn.jpg')
```

#### getStream(relativePath)
returns file as `Readable` stream
```javascript
const stream = await Drive.disk('azure').getStream('unicorn.jpg')
```

#### put(relativePath, Buffer)
```javascript
await Drive.disk('azure').put('unicorn.jpg', Buffer.from('Hello world!'))
```

#### putStream(relativePath, Readable)
```javascript
await Drive.disk('azure').putStream('unicorn.jpg', stream)
```

#### delete(relativePath)
```javascript
await Drive.disk('azure').delete('unicorn.jpg')
```

#### move(relativeSrcPath, relativeDestPath, options = {})
```javascript
await Drive.disk('azure').move('unicorn.jpg', 'unicorn-moved.jpg')
```
options
```javascript
{
    destContainer: <String> // Default is same as current
}
```

#### copy(relativeSrcPath, relativeDestPath, options = {})
```javascript
await Drive.disk('azure').copy('unicorn.jpg', 'unicorn-copy.jpg')
```
options
```javascript
{
    destContainer: <String> // Default is same as current
}
```

#### getUrl(relativePath)
```javascript
const url = await Drive.disk('azure').getUrl('unicorn.jpg')
```

#### getSignedUrl(relativePath, options = {})
```javascript
const url = await Drive.disk('azure').getSignedUrl('unicorn.jpg')
```
options
```javascript
{
    permissions: "r", // (default)
    expiry: 3600, // (default)
    startsOn: new Date() // (default)
}
```
permission access options
```
"r" = Read
"a" = Add
"c" = Create
"w" = Write
"d" = Delete
```

#### Change container
```javascript
const url = await Drive.disk('azure').container('second-container').exists('unicorn.jpg')
```

## Things to note 📒
1. For now this package only supports blob storage
2. The Azure AD credentials is not tested, but is implemeted the same way as the samples, if it worked please let me know
