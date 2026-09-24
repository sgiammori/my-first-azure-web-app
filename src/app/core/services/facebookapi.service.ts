import { Inject, Injectable, NgZone, OnInit } from '@angular/core';
import { environment } from '../../shared/environments';
import { BehaviorSubject } from 'rxjs';
import { DOCUMENT } from '@angular/common';
import { WINDOW } from '../../shared/window';
import { INews } from '../../shared/models/INews';
declare var window: any;
declare var FB: any;
declare var document: any;

@Injectable({
  providedIn: 'root'
})
export class FacebookapiService {

  private isLoggedIn = false;

  private uid: string = '';
  private name: string = '';

  public ready = new BehaviorSubject<boolean>(false);
  constructor(private zone: NgZone, @Inject(DOCUMENT) private document: Document, @Inject(WINDOW) public window: Window) {
    // Robust Facebook SDK loader: always set fbAsyncInit before script, handle FB already present
    const sdkScriptId = 'facebook-jssdk';
    // Always set fbAsyncInit first
    (window as any).fbAsyncInit = () => {
      console.log('fbAsyncInit called');
      if (typeof FB !== 'undefined') {
        FB.init({
          appId: environment.appId,
          cookie: true,
          xfbml: true,
          version: 'v25.0'
        });
        this.zone.run(() => {
          this.ready.next(true);
        });
      } else {
        console.error('FB is undefined in fbAsyncInit');
      }
    };

    // If FB is already defined, initialize and mark ready immediately
    if ((window as any).FB && typeof FB !== 'undefined') {
      console.log('FB already defined, initializing immediately');
      FB.init({
        appId: environment.appId,
        cookie: true,
        xfbml: true,
        version: 'v25.0'
      });
      this.zone.run(() => {
        this.ready.next(true);
      });
      return;
    }

    // Only add the SDK script if FB is not defined
    const existingScript = document.getElementById(sdkScriptId);
    if (!existingScript) {
      const js = document.createElement('script');
      js.id = sdkScriptId;
      js.src = 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v25.0';
      js.async = true;
      js.onload = () => {
        console.log('Facebook SDK script loaded');
        // If fbAsyncInit hasn't fired after 2s, call it manually as fallback
        setTimeout(() => {
          if (!(window as any).FB) {
            console.warn('FB not found after script load, retrying fbAsyncInit fallback');
            if ((window as any).fbAsyncInit) (window as any).fbAsyncInit();
          }
        }, 2000);
      };
      js.onerror = () => {
        console.error('Failed to load Facebook SDK script');
      };
      document.body.appendChild(js);
    } else {
      console.log('Facebook SDK script already present');
    }
  }

  /*private fetchUserProfile() {
    FB.api('/me', { fields: 'name,email' }, (profileResponse: any) => {
      if (profileResponse && !profileResponse.error) {
        this.name = profileResponse.name;
        this.uid = profileResponse.id;
        console.log('Good to see you,', profileResponse.name);
      } else {
        console.error('Failed to fetch user profile:', profileResponse.error);
      }
    });
  }*/

  /**
     * Log in with all required permissions and return the user access token.
     * @returns Promise<string> user access token
     */
    loginWithPermissions(): Promise<string> {
      return new Promise((resolve, reject) => {
        this.ready.subscribe((isReady) => {
          if (!isReady) {
            reject('Facebook SDK not ready');
            return;
          }
          FB.login((response: any) => {
            if (response.authResponse) {
              resolve(response.authResponse.accessToken);
            } else {
              reject('User cancelled login or did not fully authorize.');
            }
          }, {
            scope: 'email,pages_show_list,business_management,pages_read_engagement,pages_manage_posts'
          });
        });
      });
    }

    /**
     * Get the Page access token for a given Page ID using the user access token.
     * @param userAccessToken The user access token
     * @param pageId The Facebook Page ID
     * @returns Promise<string> page access token
     */
    async getPageAccessToken(userAccessToken: string, pageId: string): Promise<string> {
      const url = `https://graph.facebook.com/v25.0/me/accounts?access_token=${userAccessToken}`;
      try {
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error?.message || 'Failed to fetch pages');
        }
        const page = (data.data || []).find((p: any) => p.id === pageId);
        if (!page || !page.access_token) {
          throw new Error('Page access token not found for this Page ID');
        }
        return page.access_token;
      } catch (error) {
        console.error('Error fetching Page access token:', error);
        throw error;
      }
    }

  /**
   * Post a news item to a Facebook Page using the Page access token.
   * @param pageId The Facebook Page ID
   * @param message The message to post
   * @param pageAccessToken The Page access token (must have pages_manage_posts)
   * @returns Promise resolving to the API response
   */
  async postToPage(pageId: string, message: string, pageAccessToken: string): Promise<any> {
    if (!pageId || !message || !pageAccessToken) {
      throw new Error('pageId, message, and pageAccessToken are required');
    }
    // Format the message with more INews fields
    const url = `https://graph.facebook.com/v25.0/${pageId}/feed`;
    const body = new URLSearchParams({
      message,
      access_token: pageAccessToken
    });
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to post to Facebook Page');
      }
      return data;
    } catch (error) {
      console.error('Error posting to Facebook Page:', error);
      throw error;
    }
  }

  logout() {
    //if we do have a non-null response.session, call FB.logout(),
    //the JS method will log the user out of Facebook and remove any authorization cookies
    console.log("logout..");
    FB.logout(function (response : any) {
      // user is now logged out
    });

  }
}
