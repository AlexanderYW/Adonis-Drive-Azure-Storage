The package has been configured successfully!

## Validating environment variables

The configuration for Azure Storage relies on certain environment variables and it is usually a good practice to validate the presence of those environment variables.

Open `env.ts` file, choose what method you want to use and paste that inside it.

```ts
AZURE_CONTAINER: Env.schema.string(),
// There is 4 diffent way to connect to blob storage shown below

// 1. Either SAS or use `UseDevelopmentStorage=true` for local development
AZURE_CONNECTION_STRING: Env.schema.string(),

// 2. Remote storage emulator
AZURE_KEY: Env.schema.string(), // Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==
AZURE_SECRET: Env.schema.string(), // devstoreaccount1
// local_address below is used to find the remote emulator
AZURE_LOCAL_ADDRESS: Env.schema.string(), // 'http://192.168.0.2:10000/devstoreaccount1'

// 3. Azure blob storage
AZURE_KEY: Env.schema.string(),
AZURE_SECRET: Env.schema.string(),

// 4. Azure AD (Not tested, might work, no promise)
AZURE_TENANT_ID: Env.schema.string(),
AZURE_CLIENT_ID: Env.schema.string(),
AZURE_CLIENT_SECRET: Env.schema.string(),
```

## Update `contracts/drive.ts` file

Next, you must inform the TypeScript static compiler about the disk that will be using the gcs driver.

Open the `contracts/drive.ts` file and paste the following code snippet inside it.

```ts
declare module '@ioc:Adonis/Core/Drive' {
  interface DisksList {
    // ... other disks
    AzureStorage: {
      config: AzureStorageDriverConfig
      implementation: AzureStorageDriverContract
    }
  }
}
```

## Define config

Once you define the disk inside the contracts file. The TypeScript will automatically validate the drive config file and will force you to define the config for the disk as well.

Open the `config/drive.ts` and paste the following code snippet inside it.

```ts
{
  disks: {
    // ... other disk
    AzureStorage: {
      driver: 'AzureStorage',
      container: Env.get('AZURE_CONTAINER'),

      // 1. Either SAS or use `UseDevelopmentStorage=true` for local development
      connection_string: Env.get('AZURE_CONNECTION_STRING'),

      // 2. Remote storage emulator
      name: Env.get('AZURE_KEY'),
      key: Env.get('AZURE_SECRET'),
      local_address: Env.get('AZURE_LOCAL_ADDRESS'),

      // 3. Azure blob storage
      name: Env.get('AZURE_KEY'),
      key: Env.get('AZURE_SECRET'),

      // 4. Azure AD (Not tested, might work, no promise)
      azure_tenant_id: Env.get('AZURE_TENANT_ID'),
      azure_client_id: Env.get('AZURE_CLIENT_ID'),
      azure_client_secret: Env.get('AZURE_CLIENT_SECRET')
    }
  }
}
```

## Requirements 📦
Adonis Drive
```sh
npm install @adonisjs/drive --save

node ace configure @adonisjs/drive
````

```sh
npm install adonis-drive-azure-storage --save

node ace configure adonis-drive-azure-storage
```
