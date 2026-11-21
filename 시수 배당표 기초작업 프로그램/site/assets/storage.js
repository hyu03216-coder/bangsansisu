/* Clear Grid local browser adapter. Can be replaced by a protected authenticated API in a later phase.
   This DOES NOT upload data to Netlify. Browser storage is origin- and profile-specific. */
(function(){
  'use strict';
  const api={
    mode:'localStorage',
    getRaw(key){return localStorage.getItem(key);},
    setRaw(key,value){localStorage.setItem(key,String(value));return true;},
    removeRaw(key){localStorage.removeItem(key);},
    readJSON(key,fallback){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback;}catch(e){console.warn('저장 데이터 읽기 실패',e);return fallback;}},
    writeJSON(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch(e){console.error('저장 용량 또는 권한 오류',e);return false;}}
  };
  Object.defineProperty(window,'CGStore',{value:Object.freeze(api),configurable:false,writable:false});
})();
