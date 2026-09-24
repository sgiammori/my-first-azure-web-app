export declare function fn(): any;
declare let $: any;

// Facebook SDK types
declare namespace fb {
	interface AuthResponse {
		accessToken: string;
		expiresIn: string;
		signedRequest: string;
		userID: string;
	}
	interface StatusResponse {
		status: string;
		authResponse?: AuthResponse;
	}
}

declare const FB: any;

