import { writeStringToFileAsync } from '../../../../utilities/writeStringToFileAsync.js';
import { getCognitoIdToken } from './components/getCognitoIdToken.js';
import { logIn } from './components/logIn.js';
import { readSessionFromFile } from './components/readSessionFromFile.js';
import { validateSession } from './components/validateSession.js';
import { SESSION_DIRECTORY, SESSION_FILE_NAME } from './constants.js';
import { ISession } from './types.js';

/** Maintains an authenticated web session with Shutterfly. */
export class Authenticator {
    /** In-memory session. Helps reduce disk read operations. */
    _session: ISession | undefined;

    /**
     * Establishes an authenticated session, stores it in memory, and writes it to a file.
     * 
     * @param isVerbose - Whether or not to be verbose.
     * @returns Promisified Cognito idToken. Settles when data is ready.
     */
    async authenticate(isVerbose: boolean = false): Promise<string> {
        const consoleGroup = isVerbose ? console.group : () => {};
        const consoleGroupEnd = isVerbose ? console.groupEnd : () => {};
        const consoleLog = isVerbose ? console.log : () => {};

        if (typeof this._session === 'undefined') {
            consoleLog('\nHydrating session from file...');
            consoleGroup();
            this._session = await readSessionFromFile(isVerbose);
            consoleGroupEnd();
            consoleLog('...done!');
        }

        if (typeof this._session !== 'undefined') {
            consoleLog('\nValidating existing session...');
            consoleGroup();
            if (validateSession(this._session, isVerbose)) {
                consoleLog('Existing session is valid.');
                const oldCognitoIdToken = getCognitoIdToken(this._session.cookies);
                if (typeof oldCognitoIdToken === 'string') {
                    consoleLog('Existing Cognito idToken is valid.');
                    consoleGroupEnd();
                    consoleLog('...done!');
                    return oldCognitoIdToken;
                } else {
                    consoleLog('Existing Cognito idToken is invalid.');
                }
            } else {
                consoleLog('Existing session is invalid.');
            }
            consoleGroupEnd();
            consoleLog('...done!');
        }

        consoleLog('\nLogging in to Shutterfly...');
        consoleGroup();
        this._session = await logIn();
        if (typeof this._session === 'undefined') {
            throw new Error('Failed to log in to Shutterfly.');
        }
        consoleGroupEnd();
        consoleLog('...done!');

        consoleLog('\nWriting session to file...');
        consoleGroup();
        await writeStringToFileAsync({
            fromString: JSON.stringify(this._session, null, 4),
            toDirectory: SESSION_DIRECTORY,
            toFileName: SESSION_FILE_NAME,
        });
        consoleGroupEnd();
        consoleLog('...done!');

        consoleLog('\nValidating new Cognito idToken...');
        consoleGroup();
        const newCognitoIdToken = getCognitoIdToken(this._session.cookies);
        if (typeof newCognitoIdToken === 'string') {
            consoleGroupEnd();
            consoleLog('...done!');
            return newCognitoIdToken;
        } else {
            throw new Error('New Cognito idToken is invalid.');
        }
    }
}
