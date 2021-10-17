import { Exception } from '@adonisjs/core/build/standalone'

/**
 * Unable to create container
 */
export class CannotCreateContainerException extends Exception {
  /* tslint:disable:no-unused-variable */
  private containerName: string
  /* tslint:disable:no-unused-variable */
  private original: any
  public static invoke(containerName: string, original: any): CannotCreateContainerException {
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
  /* tslint:disable:no-unused-variable */
  private containerName: string
  /* tslint:disable:no-unused-variable */
  private original: any
  public static invoke(containerName: string, original: any): CannotFindContainerException {
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
  /* tslint:disable:no-unused-variable */
  private containerName: string
  /* tslint:disable:no-unused-variable */
  private original: any
  public static invoke(containerName: string, original: any): CannotDeleteContainerException {
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
