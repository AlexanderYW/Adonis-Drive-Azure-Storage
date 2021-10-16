/*
 * @adonisjs/drive-gcs
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
import dotenv from 'dotenv'
dotenv.config()

export const AZURE_CONTAINER = process.env.AZURE_CONTAINER!
export const AZURE_CONNECTION_STRING = process.env.AZURE_CONNECTION_STRING!

export const authenticationOptions = {
  connection_string: AZURE_CONNECTION_STRING,
}
