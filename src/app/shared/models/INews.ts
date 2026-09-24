


export interface INews {
  id: number;
  title?: string;
  subtitle?: string;
  content?: string;
  date?: Date | string;
  authors?: IAuthors[];
  htmlContent?: string;
  uploadedOnFacebook?: boolean;
}

export interface IAuthors {
  id: number
  author: string
}
