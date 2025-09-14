// src/polyfills.ts
import 'react-native-url-polyfill/auto';     // <-- gives global.URL + URLSearchParams
import 'react-native-get-random-values';     // <-- for uuid/crypto usage on RN

// Some libs expect atob/btoa and Buffer:
import {encode as btoa, decode as atob} from 'base-64';
if (!(global as any).atob)  (global as any).atob  = atob;
if (!(global as any).btoa)  (global as any).btoa  = btoa;

import {Buffer} from 'buffer';
if (!(global as any).Buffer) (global as any).Buffer = Buffer;
