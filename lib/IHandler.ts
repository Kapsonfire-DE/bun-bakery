export interface IHandler {
     addRoute (file: string): Promise<object>,
     withExtension: boolean,
     withoutExtension: boolean
}