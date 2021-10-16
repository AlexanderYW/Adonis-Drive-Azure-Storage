/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { Exception } from '@adonisjs/core/build/standalone'

/**
 * Unable to write file to the destination
 */
export declare class CannotCreateContainerException extends Exception {
  containerName: string // A container name
  original: any // Original error
  static invoke(containerName: string, original: any): CannotCreateContainerException
}

/**
 * Unable to get file metadata
 */
export declare class CannotFindContainerException extends Exception {
  containerName: string
  original: any
  static invoke(containerName: string, original: any): CannotFindContainerException
}

/**
 * Unable to delete file from a given location
 */
export declare class CannotDeleteContainerException extends Exception {
  containerName: string
  original: any
  static invoke(containerName: string, original: any): CannotDeleteContainerException
}
