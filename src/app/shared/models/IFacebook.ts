export interface IFacebook {
  status: string
  autResponse: IAuthResponse
}

export interface IAuthResponse {
  accessToken: string
  expiresIn: string
  signedRequest: string
  userID: string
}
