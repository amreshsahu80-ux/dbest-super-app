package com.dbest4u.app;

import android.webkit.WebView;

/**
 * Android-only privacy entry and removal of the redundant legacy footer copy.
 * Does not edit the website, change authentication or expose a JavaScript bridge.
 * The custom URL is handled only by MainActivity while on a trusted DBest origin.
 */
final class DbestAccountSettings {
    private DbestAccountSettings() {}

    private static final String JS =
        "(function(){"
      // The old website footer is only decorative copy, not the separate
      // legal/contact footer. Remove it solely in Android WebView.
      + "var legacy=document.querySelector('body > div.foot');"
      + "if(legacy){var desc=legacy.querySelector('.w > p');"
      + "if(desc&&desc.textContent.indexOf('Sarwashresth Services OPC Pvt. Ltd.')!==-1)"
      + "legacy.style.setProperty('display','none','important');}"
      // Android-only WhatsApp mini-button: preserve original opt-in behavior
      // and accessible label while avoiding the persistent large footer overlay.
      + "if(!document.getElementById('dbestAndroidFloatersStyle')){"
      + "var style=document.createElement('style');style.id='dbestAndroidFloatersStyle';"
      + "style.textContent='body.dbestNativeDock #dbestWhatsAppEnable{visibility:hidden!important;pointer-events:none!important;}#dbestWhatsAppEnable{width:48px!important;min-width:48px!important;height:48px!important;min-height:48px!important;padding:0!important;font-size:0!important;overflow:hidden!important;}#dbestWhatsAppEnable::after{content:\\'WA\\';font:800 13px system-ui;color:#fff;}';"
      + "(document.head||document.documentElement).appendChild(style);}"
      + "if(window.__dbestAndroidAccountPrivacyInstalled)return;"
      + "var mount=document.getElementById('m');if(!mount)return;"
      + "window.__dbestAndroidAccountPrivacyInstalled=true;"
      + "function install(){"
      + "var page=mount.querySelector('.sectionOverlay .sectionPage');if(!page)return;"
      + "var heading=page.querySelector('.sectionTitle b');"
      + "var title=(heading&&heading.textContent||'').toLowerCase();"
      + "if(!/account|profile|register\\s*\\/\\s*login/i.test(title))return;"
      + "var target=page.querySelector('.sectionContent .subs')||page.querySelector('.sectionContent');"
      + "if(!target||target.querySelector('[data-dbest-native-privacy]'))return;"
      + "var entry=document.createElement('button');"
      + "entry.type='button';entry.className='sub';"
      + "entry.setAttribute('data-dbest-native-privacy','1');"
      + "var name=document.createElement('b');name.textContent='Account & Privacy';"
      + "var detail=document.createElement('small');"
      + "detail.textContent='Account settings and deletion requests';"
      + "entry.appendChild(name);entry.appendChild(detail);"
      + "entry.addEventListener('click',function(){location.href='dbest-account://settings';});"
      + "target.appendChild(entry);"
      + "}"
      + "new MutationObserver(install).observe(mount,{childList:true,subtree:true});"
      + "install();"
      + "})()";

    static void install(WebView webView) {
        if (webView != null) webView.evaluateJavascript(JS, null);
    }
}
