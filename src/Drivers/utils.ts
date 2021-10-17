import { Exception } from '@adonisjs/core/build/standalone'

/**
 * Unable to create container
 */
export class CannotCreateContainerException extends Exception {
  private containerName: string
  private original: any
  public static invoke(containerName: string, original: any) {
    const error = new this(
      `Cannot create container with name: "${containerName}"`,
      500,
      'E_CANNOT_CREATE_CONTAINER'
    )
    error.containerName = containerName
    error.original = original
    return error
  }
}

/**
 * Unable to create container
 */
export class CannotFindContainerException extends Exception {
  private containerName: string
  private original: any
  public static invoke(containerName: string, original: any) {
    const error = new this(
      `Cannot find container with name: "${containerName}"`,
      500,
      'E_CANNOT_FIND_CONTAINER'
    )
    error.containerName = containerName
    error.original = original
    return error
  }
}

/**
 * Unable to create container
 */
export class CannotDeleteContainerException extends Exception {
  private containerName: string
  private original: any
  public static invoke(containerName: string, original: any) {
    const error = new this(
      `Cannot delete container with name: "${containerName}"`,
      500,
      'E_CANNOT_CREATE_CONTAINER'
    )
    error.containerName = containerName
    error.original = original
    return error
  }
}
