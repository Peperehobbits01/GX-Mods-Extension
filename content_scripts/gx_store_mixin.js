console.log("[GXM] Injected into GX store!")
let lastHref = ""
let wallpaperObservers = []
function addLocationObserver(callback) {
    const config = { attributes: false, childList: true, subtree: false }
    const observer = new MutationObserver(callback)
    observer.observe(document.body, config)
}
const delay = ms => new Promise(res => setTimeout(res, ms));

function observerCallback() {
    if (window.location.href != lastHref) {
        wallpaperObservers.forEach(function(obs) {
            obs.disconnect()
        })
        wallpaperObservers.length = 0

        let pathArray = window.location.href.split('/');
        let arrayPos = pathArray.indexOf('mods') + 1;
        let modId = pathArray[arrayPos]
        if ((!modId) || (modId == "") || (modId.includes("http")) || (modId.includes("gx.me"))) {
            if (!window.location.href.includes('/mods/')) {
                console.log("[GXM] Injecting into home page...")
                initHomeScript()
            }
        } else {
            console.log("[GXM] Injecting into mod page...")
            console.log("[GXM] Detected ID:",modId)
            initContentScript()
        }
    }
    lastHref = window.location.href
}

addLocationObserver(observerCallback)
observerCallback()

var timeout = 3000; // 3000ms = 3 seconds

function fetchRetry(url, options = {}, retries = 3, backoff = 300) {
    const retryCodes = [408, 500, 502, 503, 504, 522, 524];
    const notFoundCodes = [403, 404];
    return content.fetch(url, options)
        .then(res => {
            if (res.ok) {
                console.log("Fetch succeeded, downloading json...");
                return res.json();
            }

            if (retries > 0 && retryCodes.includes(res.status)) {
                setTimeout(() => {
                    return fetchRetry(url, options, retries - 1, backoff * 2);
                }, backoff);
            } else {
                console.log(res)
                if (notFoundCodes.includes(res.status)) {
                    return null
                } else {
                    throw new Error("Failed to fetch file");
                }
            }
        })
        .catch(console.error);
}

function fetchRetryBlob(url, options = {}, retries = 3, backoff = 300) {
    const retryCodes = [408, 500, 502, 503, 504, 522, 524];
    const notFoundCodes = [403, 404];
    return content.fetch(url, options)
        .then(res => {
            if (res.ok) {
                console.log("Fetch succeeded, downloading blob...");
                return res.blob();
            }

            if (retries > 0 && retryCodes.includes(res.status)) {
                setTimeout(() => {
                    return fetchRetryBlob(url, options, retries - 1, backoff * 2);
                }, backoff);
            } else {
                console.log(res)
                if (notFoundCodes.includes(res.status)) {
                    return null
                } else {
                    throw new Error("Failed to fetch blob");
                }
            }
        })
        .catch(console.error);
}

function fetchRetryText(url, options = {}, retries = 3, backoff = 300) {
    const retryCodes = [408, 500, 502, 503, 504, 522, 524];
    const notFoundCodes = [403, 404];
    return fetch(url, options)
        .then(res => {
            if (res.ok) {
                console.log("Fetch succeeded, downloading text...");
                return res.text();
            }

            if (retries > 0 && retryCodes.includes(res.status)) {
                setTimeout(() => {
                    return fetchRetryText(url, options, retries - 1, backoff * 2);
                }, backoff);
            } else {
                console.log(res)
                if (notFoundCodes.includes(res.status)) {
                    return null
                } else {
                    throw new Error("Failed to fetch text");
                }
            }
        })
        .catch(console.error);
}

function renderWallpaper(wallpaperObject, modId) {
    if ((!modId) || (modId == "") || (modId.includes("http")) || (modId.includes("gx.me"))) {
        wallpaperObject.textContent = "Couldn't get mod ID."
    } else {
        fetchRetry(`https://api.gx.me/store/v3/mods/${modId}`).then(async function(result) {
            if (result.data) {
                let contentFiles = result.data.contentFiles
                let contentUrl = result.data.contentUrl
                if ((contentFiles != null) && (contentUrl != null)) {
                    var contentFile = contentFiles.find(e => (e.hasOwnProperty('archivePath') && e.hasOwnProperty('fileType') && (e.fileType.includes("WALLPAPER_IMAGE") || e.fileType.includes("WALLPAPER_FIRST_FRAME") || e.fileType.includes("WALLPAPER_LAYER_RESOURCE") || e.fileType.includes("WALLPAPER_PREVIEW")) && e.hasOwnProperty('mediaType') && e.mediaType == "IMAGE"))
                    if (contentFile) {
                        let renderer = wallpaperObject.parentElement
                        renderer.setAttribute("gxm-image",`url("${contentUrl}/${contentFile.archivePath}")`)
                        renderer.classList.add("gxm_wallpaper_renderer");

                        var observer = new MutationObserver(function(mutations) {
                            mutations.forEach(function(mutation) {
                                mutation.addedNodes.forEach(function(potentialObj) {
                                    if (potentialObj.matches('div[data-stats-id*="marketplace-mod-preview-wallpaper-redirect"]')) {
                                        potentialObj.textContent = ""
                                        potentialObj.style.backgroundImage = `url("${contentUrl}/${contentFile.archivePath}")`
                                        potentialObj.style.backgroundSize = "cover"
                                        console.log("Replaced wallpaper")
                                    }   
                                });
                            });    
                        });
                        observer.observe(renderer, {childList: true});
                        wallpaperObservers.push(observer)

                        wallpaperObject.textContent = ""
                        wallpaperObject.style.backgroundImage = `url("${contentUrl}/${contentFile.archivePath}")`
                        wallpaperObject.style.backgroundSize = "cover"
                    } else {
                        wallpaperObject.textContent = "Can't display this wallpaper."
                    }
                }
            } else {
                wallpaperObject.textContent = "Failed to load wallpaper."
            }
        })
    }
}

function handleModButton(installModButton, modId) {
    installModButton.setAttribute("disabled","")
    installModButton.classList.add("gxm_injected");
    installModButton.textContent = "A moment, please..."
    installModButton.removeAttribute("href")
    installModButton.parentElement.removeAttribute("href")

    console.log("[GXM] Mod ID:",modId)
    if ((!modId) || (modId == "") || (modId.includes("http")) || (modId.includes("gx.me"))) {
        installModButton.textContent = "Couldn't get mod ID."
    } else {
        fetchRetry(`https://api.gx.me/store/v3/mods/${modId}`).then(async function(result) {
            if (result.data) {
                let modPayload = result.data.manifestSource.mod.payload
                if ((result.data.contentFiles != null) && (result.data.contentUrl != null) && (result.data.manifestSource != null) && (result.data.manifestSource.mod != null) && (modPayload != null) && (result.data.packageVersion != null) && (result.data.modShortId != null)) {
                    let musicArray = modPayload.background_music
                    let keyboardArray = modPayload.keyboard_sounds
                    let browserArray = modPayload.browser_sounds
                    let cssArray = modPayload.page_styles
                    let themeArray = modPayload.theme
                    let fileList = result.data.contentFiles

                    if (musicArray || keyboardArray || browserArray || cssArray || themeArray) {
                        /*https://play.gxc.gg/mods/922a6edc-98e4-432e-8096-5892210dd9b0/e3a14659-05e5-4bb7-878c-38249f58968b/2f4daefd-0f05-4fb5-8893-ca8f64b785ee/contents/music/layer1.wav*/
                        let modInternalId = result.data.mangledTitle + "-" + result.data.crxId
                        let modStorePage = `https://store.gx.me/mods/${result.data.modShortId}/${result.data.mangledTitle}/`
                        let modVersion = result.data.packageVersion
                        let modName = result.data.title
                        let baseURL = result.data.contentUrl
                        installModButton.textContent = "Almost there..."
                        let installData = await browser.runtime.sendMessage({
                            intent: "getModState",
                            modId: modInternalId,
                        })
                        console.log("Got install data")
                        if ((installData != false) && (installData != null)) {
                            //console.log(installData)
                            if (installData.layers || installData.keyboardSounds || installData.browserSounds || installData.webMods || installData.theme) {
                                if (installData.version) {
                                    if (installData.version != modVersion) {
                                        installModButton.textContent = "Update"
                                    } else {
                                        installModButton.textContent = "Reinstall"
                                    }
                                } else {
                                    installModButton.textContent = "Replace local version"
                                }
                            } else {
                                installModButton.textContent = "Install with GXM"
                            }
                            installModButton.removeAttribute("disabled")
                            installModButton.addEventListener("click", async (event) => {
                                console.log("[GXM] Initiating install")
                                installModButton.setAttribute("disabled","")
                                
                                let ignoreFailure = false
                                if (installModButton.hasAttribute("installError")) {
                                    installModButton.textContent = "Waiting for user"
                                    if (confirm('Would you like to ignore missing assets this time? This will give you a better chance of installing the mod, although it might not function as the author intended.')) {
                                        ignoreFailure = true
                                    }
                                }

                                installModButton.textContent = "Installing..."

                                //insert "don't close the tab" warning
                                if (installModButton.parentElement.querySelector(".gxm-warning") == null) {
                                    installModButton.parentElement.insertAdjacentHTML("beforeend",`
                                    <span class="gx-subheader-s text-l2 my-1 gxm-warning">
                                        <p class="flex justify-center items-center gap-1 pt-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 17 15" class="size-4 shrink-0 mr-1 text-primary-240"><path fill="currentColor" fill-rule="evenodd" d="M6.92.9c.702-1.2 2.458-1.2 3.16 0l6.673 11.4c.702 1.2-.176 2.7-1.58 2.7H1.827C.423 15-.455 13.5.248 12.3L6.92.9Zm2.107.6a.612.612 0 0 0-1.054 0L1.301 12.9a.6.6 0 0 0 .527.9h13.345a.6.6 0 0 0 .526-.9L9.027 1.5Z" clip-rule="evenodd"></path><path fill="currentColor" d="M7.689 5.573c0-.442.363-.8.811-.8.448 0 .811.358.811.8 0 .442-.363.8-.811.8a.806.806 0 0 1-.811-.8ZM8.189 7.356a.5.5 0 0 0-.5.5v3.917a.5.5 0 0 0 .5.5h.622a.5.5 0 0 0 .5-.5V7.856a.5.5 0 0 0-.5-.5h-.622Z"></path></svg>
                                            <span class="gxm-warning-text">
                                                <b>Warning:</b> Don't close the tab until installation is complete.
                                            </span>
                                        </p>
                                    </span>
                                    `)
                                }
                                const dontCloseWarning = installModButton.parentElement.querySelector(".gxm-warning");
                                const dontCloseText = dontCloseWarning.querySelector(".gxm-warning-text");
                                dontCloseText.innerHTML = "<b>Warning:</b> Don't close the tab until installation is complete."
                                
                                let installResult = await installMod({
                                    intent: "installMod",
                                    retry: ignoreFailure,
                                    modId: modInternalId,
                                    modContentUrl: baseURL,
                                    modLayers: musicArray,
                                    modKeyboardSounds: keyboardArray,
                                    modBrowserSounds: browserArray,
                                    modCSS: cssArray,
                                    modTheme: themeArray,
                                    modVersion: modVersion,
                                    modDisplayName: modName,
                                    modStorePage: modStorePage,
                                    modMangledTitle: result.data.mangledTitle,
                                    modShortId: result.data.modShortId,
                                    modIcons: result.data.icons,
                                    modContentFiles: fileList
                                })

                                console.log("Install result");
                                console.log(installResult);
                                if (installResult.succeeded) {
                                    dontCloseWarning.remove()
                                    installModButton.textContent = "Reinstall"
                                    installModButton.removeAttribute("installError")
                                    
                                    if (installResult.missing) {
                                        let missingContent = ""

                                        if (installResult.missing.layers) {
                                            missingContent += "Background Music"
                                        }
                                        if (installResult.missing.keyboardSounds) {
                                            if (missingContent != "") {
                                                missingContent += "\n"
                                            }
                                            missingContent += "Keyboard Sounds"
                                        }
                                        if (installResult.missing.browserSounds) {
                                            if (missingContent != "") {
                                                missingContent += "\n"
                                            }
                                            missingContent += "Browser Sounds"
                                        }
                                        if (installResult.missing.webMods) {
                                            if (missingContent != "") {
                                                missingContent += "\n"
                                            }
                                            missingContent += "Web Mods"
                                        }

                                        if (missingContent != "") {
                                            alert(`Some assets from the following categories could not be found:\n\n${missingContent}\n\nThe mod may not function as intended by the author.\nThis issue is commonly caused by a misconfiguration from either the mod author, or the GX Store itself.\nMore details are available in the console.`)
                                        }
                                    }
                                } else {
                                    dontCloseText.innerHTML = `If the issue persists, <a href="https://github.com/noblereign/GX-Mods-Extension/issues/new/choose" class="gx-button-s rounded-s border border-transparent bg-secondary-120 px-1 transition-all active:bg-secondary-80 hover:bg-secondary-160">report it to us.</a>`
                                    installModButton.textContent = installResult.error ? installResult.error : "Something went wrong."
                                    if (installResult.retryOffered) {
                                        installModButton.setAttribute("installError","true")
                                    }
                                }
                                installModButton.removeAttribute("disabled")
                            });
                            browser.runtime.onMessage.addListener((message) => {
                                if (message.targetMod && (message.targetMod == modInternalId)) {
                                    installModButton.textContent = message.newText ? message.newText : "..."
                                    return true
                                }
                                return false
                            });
                        } else {
                            installModButton.textContent = "Failed to read from disk."
                        }
                    } else {
                        installModButton.textContent = "Incompatible with GXM"
                    }
                } else {
                    installModButton.textContent = "Can't verify this mod."
                }
            } else {
                installModButton.textContent = "GX.store returned empty value."
            }
        })
        .catch(function (error) {
            console.log(`Something happened: ${error}`);
            installModButton.textContent = "Failed to get API response."
        });
    }
}


async function initHomeScript() {
    async function searchForButton() {
        console.log("[GXM] Searching for button...")
        for (const a of document.querySelectorAll(`a[data-stats-id="mod-download-gx-button"] > button`)) {
            if (a.textContent.includes("Opera GX") && !a.classList.contains('gxm_injected')) {
                let installModButton = a
                let foundHeadline = a.parentElement.parentElement.parentElement.querySelector('.gx-header-s')
                let foundPreview = a.closest(`div[data-stats-id*="marketplace-mod-preview"]`)

                if (foundHeadline) {
                    let foundHref = foundHeadline.href
                    if (foundHref) {
                        let pathArray = foundHref.split('/');
                        let arrayPos = pathArray.indexOf('mods') + 1;
                        let modId = pathArray[arrayPos]

                        if (foundPreview) {
                            let foundBackground = null;
                            async function search() {
                                foundBackground = foundPreview.querySelector('div[data-stats-id*="marketplace-mod-preview-wallpaper-redirect"]')
                                return foundBackground != null
                            }
                            let keepRetrying = true
                            search().then(function() {
                                if (!foundBackground) {
                                    var intervalId = setInterval(function() {
                                        search()
                                        if (foundBackground || !keepRetrying) {
                                            clearInterval(intervalId);
                                        }
                                    }, 500);
                                }
                                function waitForBG(timeout) {
                                    var start = Date.now();
                                    return new Promise(waitForFoo); 
                                    function waitForFoo(resolve, reject) {
                                        if (foundBackground)
                                            resolve(foundBackground);
                                        else if (timeout && (Date.now() - start) >= timeout)
                                            reject(new Error("couldn't find bg in time :/"));
                                        else
                                            setTimeout(waitForFoo.bind(this, resolve, reject), 30);
                                    }
                                }
                                waitForBG(timeout).then(function(){
                                    renderWallpaper(foundBackground, modId)
                                })
                                .catch(function (err) {
                                    console.log("Giving up");
                                    keepRetrying = false
                                });
                            });
                        }

                        handleModButton(installModButton, modId)
                    } else {
                        installModButton.textContent = "Couldn't get mod ID."
                    }
                } else {
                    installModButton.textContent = "Couldn't get mod ID."
                }
            }
        }
    }
    let timesDone = 0
    
    var intervalId = setInterval(function() {
        searchForButton()
        timesDone++
        if (timesDone >= 12) {
            clearInterval(intervalId);
        }
    }, 500);

}

function updateInstallerButtons(modId,text) {
    browser.runtime.sendMessage({
        intent: "buttonMessage",
        modId: modId,
        text: text
    })
}

const clamp = (val, min, max) => Math.min(Math.max(val, min), max)

//const findEnvVars = /(env\()[^)]*(\))/;
function isEmptyOrSpaces(str){
    return str === null || str.match(/^ *$/) !== null;
}

async function tryToGetFile(downloadURL, fileURL, contentFiles, prefixURL, isText) {
    let downloadedFile = await (isText ? fetchRetryText(downloadURL) : fetchRetryBlob(downloadURL))
    if (!downloadedFile) {
        console.warn(`Failed to fetch ${fileURL}, falling back to contentFiles search`)
        var filename = fileURL.replace(/^.*[\\/]/, '')
        if (isEmptyOrSpaces(filename)) {
            console.warn(`Nvm... it's referencing a folder. (bruh)`)
            return {file: null, ignore: true}
        }
        var filenameBare = filename.substr(0, filename.lastIndexOf("."))
        var contentFile = contentFiles.find(e => (e.hasOwnProperty('archivePath') && e.archivePath.includes(filenameBare)))

        if (contentFile) {
            console.warn(`Attempting to download ${contentFile.archivePath}`)
            downloadedFile = await fetchRetryBlob(`${prefixURL}/${contentFile.archivePath}`)
            if (!downloadedFile) {
                console.warn(`Failed to fetch ${contentFile.archivePath}, falling further back to variants`)
                for (const variant of contentFile.variants) {
                    downloadedFile = await fetchRetryBlob(variant.url)
                    if (!downloadedFile) {
                        console.warn("Didn't work.. trying another variant")
                        await delay(1000)
                    } else {
                        break
                    }
                }
                if (!downloadedFile) {
                    console.warn(`Dang, we REALLY couldn't find ${filename}...`)
                    return {file: null, ignore: false}
                }
            }
        } else {
            console.warn(`Could not find a content file with the same name (${filename})!`)
        }
    }
    console.log("File downloaded.")
    return {file: downloadedFile, ignore: false}
}

async function installMod(message) {
    console.log('[GXM] Installing mod',message.modId);
    let rejectOnFailure = message.retry ? false : true
    let missingCategories = {
        layers: false,
        keyboardSounds: false,
        browserSounds: false,
        webMods: false
    }
                
    let downloadedLayers = []
    if (message.modLayers != null) {
        console.log("Fetching Background Music");
        updateInstallerButtons(message.modId,`Music... (0%)`)
        for (const fileURL of message.modLayers) {
            if (fileURL.hasOwnProperty('name')) { // This is a new format mod (Multiple songs in one)
                let currentDownloadedTrack = {
                    id: fileURL.id,
                    name: fileURL.name,
                    author: fileURL.author,
                    layers: []
                }
                for (const actualURL of fileURL.tracks) {
                    let downloadURL = `${message.modContentUrl}/${actualURL}`
                    console.log('[GXM] Fetching',downloadURL);
                    try {
                        let downloadInfo = await tryToGetFile(downloadURL, actualURL, message.modContentFiles, message.modContentUrl)
                        let downloadedFile = downloadInfo.file; let ignore = downloadInfo.ignore;
                        if (ignore) {
                            continue // referencing a folder, yawwwnn. should not error for this, that's the fault of the mod creator
                        }
                        if (rejectOnFailure && !downloadedFile) {
                            return {
                                succeeded: false,
                                error: "Missing assets. Retry?",
                                retryOffered: true
                            }
                        } else if (!downloadedFile) {
                            missingCategories.layers = true
                        }
                        let result = null
    
                        try {
                            let arrayBuffer = await downloadedFile.arrayBuffer()
                            result = new Blob([arrayBuffer], {type: downloadedFile.type});
                        } catch(error) {
                            console.log(error);
                        }
    
                        if (result != null) {
                            currentDownloadedTrack.layers.push(result)
                            updateInstallerButtons(message.modId,`Installing track ${Math.round(message.modLayers.indexOf(fileURL) + 1)}/${message.modLayers.length}… (${Math.round(((message.modLayers.indexOf(actualURL) + 1) / clamp(fileURL.tracks.length,1,Number.MAX_SAFE_INTEGER)) * 100)}%)`)
                        } else if (rejectOnFailure) {
                            return {
                                succeeded: false,
                                error: `Failed to encode track ${Math.round(message.modLayers.indexOf(fileURL) + 1)}.`
                            }
                        }
                    } catch (err) {
                        console.log("Download error");
                        console.log(err);
                        return {
                            succeeded: false,
                            error: `Failed to download track ${Math.round(message.modLayers.indexOf(fileURL) + 1)}.`
                        }
                    }
                }
                downloadedLayers.push(currentDownloadedTrack)
            } else { // Old style mod, just one track
                
                let downloadURL = `${message.modContentUrl}/${fileURL}`
                console.log('[GXM] Fetching',downloadURL);
                try {
                    let downloadInfo = await tryToGetFile(downloadURL, fileURL, message.modContentFiles, message.modContentUrl)
                    let downloadedFile = downloadInfo.file; let ignore = downloadInfo.ignore;
                    if (ignore) {
                        continue // referencing a folder, yawwwnn. should not error for this, that's the fault of the mod creator
                    }
                    if (rejectOnFailure && !downloadedFile) {
                        return {
                            succeeded: false,
                            error: "Missing assets. Retry?",
                            retryOffered: true
                        }
                    } else if (!downloadedFile) {
                        missingCategories.layers = true
                    }
                    console.log(downloadedFile)

                    let result = null

                    try {
                        let arrayBuffer = await downloadedFile.arrayBuffer()
                        result = new Blob([arrayBuffer], {type: downloadedFile.type});
                    } catch(error) {
                        console.log(error);
                    }

                    if (result != null) {
                        downloadedLayers.push(result)
                        updateInstallerButtons(message.modId,`Music... (${Math.round(((message.modLayers.indexOf(fileURL) + 1) / clamp(message.modLayers.length,1,Number.MAX_SAFE_INTEGER)) * 100)}%)`)
                    } else if (rejectOnFailure) {
                        return {
                            succeeded: false,
                            error: "Failed to encode."
                        }
                    }
                } catch (err) {
                    console.log("Download error");
                    console.log(err);
                    return {
                        succeeded: false,
                        error: "Failed to download."
                    }
                }
            }
        }
    }

    let downloadedKeyboardSounds = {}
    if (message.modKeyboardSounds != null) {
        console.log("Fetching Keyboard Sounds");

        if (Array.isArray(message.modKeyboardSounds)) { // New style that supports multiple keyboard sound sets (even though the only mod I've seen doing this only ever defines one???)
            let setCount = message.modKeyboardSounds.length
            let setNumber = 0;

            downloadedKeyboardSounds = [] // We will store an array of keyboard sets instead of having it all be one
            for (const keySet of message.modKeyboardSounds) {
                if (keySet.hasOwnProperty('name')) {
                    setNumber++
                    updateInstallerButtons(message.modId,`Installing keyboard ${setNumber}/${setCount}… (0%)`)
                    let currentDownloadedKeyboard = {
                        id: keySet.id,
                        name: keySet.name,
                        author: keySet.author, // The one I saw didn't have an author section, but like.. you never know at this point.
                        sounds: {}
                    }

                    let currentNumber = 0;
                    let maxNumber = 0;
                    for (const [soundCategory, soundsArray] of Object.entries(keySet.sounds)) {
                        for (const fileURL of soundsArray) {
                            maxNumber++
                        }
                    }

                    for (const [soundCategory, soundsArray] of Object.entries(keySet.sounds)) {
                        console.log("fetching",soundCategory)
                        currentDownloadedKeyboard.sounds[soundCategory] = []
                        for (const fileURL of soundsArray) {
                            let downloadURL = `${message.modContentUrl}/${fileURL}`
                            if (fileURL != "") {
                                console.log('[GXM] Fetching',downloadURL);
                                currentNumber++
                                try {
                                    let downloadInfo = await tryToGetFile(downloadURL, fileURL, message.modContentFiles, message.modContentUrl)
                                    let downloadedFile = downloadInfo.file; let ignore = downloadInfo.ignore;
                                    if (ignore) {
                                        continue // referencing a folder, yawwwnn. should not error for this, that's the fault of the mod creator
                                    }
                                    if (rejectOnFailure && !downloadedFile) {
                                        return {
                                            succeeded: false,
                                            error: "Missing assets. Retry?",
                                            retryOffered: true
                                        }
                                    } else if (!downloadedFile) {
                                        missingCategories.keyboardSounds = true
                                    }
        
                                    let result = null
                
                                    try {
                                        let arrayBuffer = await downloadedFile.arrayBuffer()
                                        result = new Blob([arrayBuffer], {type: downloadedFile.type});
                                    } catch(error) {
                                        console.log(error);
                                    }
                
                                    if (result != null) {
                                        currentDownloadedKeyboard.sounds[soundCategory].push(result)
                                        updateInstallerButtons(message.modId,`Installing keyboard ${setNumber}/${setCount}… (${Math.round((currentNumber / maxNumber) * 100)}%)`)
                                    } else if (rejectOnFailure) {
                                        return {
                                            succeeded: false,
                                            error: "Failed to encode."
                                        }
                                    }
                                } catch (err) {
                                    console.log("Download error");
                                    console.log(err);
                                    return {
                                        succeeded: false,
                                        error: "Failed to download."
                                    }
                                }
                            }
                        }
                    }
                    downloadedKeyboardSounds.push(currentDownloadedKeyboard);
                } else {
                    console.warn("This mod has weird metadata and you should really report this to the GitHub")
                    return {
                        succeeded: false,
                        error: `Odd metadata, please report this.`
                    }
                }
            }
        } else { // Old style (one set, proceed as usual)
            updateInstallerButtons(message.modId,`Keyboard sounds... (0%)`)
            let currentNumber = 0;
            let maxNumber = 0;
            for (const [soundCategory, soundsArray] of Object.entries(message.modKeyboardSounds)) {
                for (const fileURL of soundsArray) {
                    maxNumber++
                }
            }

            for (const [soundCategory, soundsArray] of Object.entries(message.modKeyboardSounds)) {
                console.log("fetching",soundCategory)
                downloadedKeyboardSounds[soundCategory] = []
                for (const fileURL of soundsArray) {
                    let downloadURL = `${message.modContentUrl}/${fileURL}`
                    if (fileURL != "") {
                        console.log('[GXM] Fetching',downloadURL);
                        currentNumber++
                        try {
                            let downloadInfo = await tryToGetFile(downloadURL, fileURL, message.modContentFiles, message.modContentUrl)
                            let downloadedFile = downloadInfo.file; let ignore = downloadInfo.ignore;
                            if (ignore) {
                                continue // referencing a folder, yawwwnn. should not error for this, that's the fault of the mod creator
                            }
                            if (rejectOnFailure && !downloadedFile) {
                                return {
                                    succeeded: false,
                                    error: "Missing assets. Retry?",
                                    retryOffered: true
                                }
                            } else if (!downloadedFile) {
                                missingCategories.keyboardSounds = true
                            }

                            let result = null
        
                            try {
                                let arrayBuffer = await downloadedFile.arrayBuffer()
                                result = new Blob([arrayBuffer], {type: downloadedFile.type});
                            } catch(error) {
                                console.log(error);
                            }
        
                            if (result != null) {
                                downloadedKeyboardSounds[soundCategory].push(result)
                                updateInstallerButtons(message.modId,`Keyboard sounds... (${Math.round((currentNumber / maxNumber) * 100)}%)`)
                            } else if (rejectOnFailure) {
                                return {
                                    succeeded: false,
                                    error: "Failed to encode."
                                }
                            }
                        } catch (err) {
                            console.log("Download error");
                            console.log(err);
                            return {
                                succeeded: false,
                                error: "Failed to download."
                            }
                        }
                    }
                }
            }
        }
    }

    let downloadedBrowserSounds = {}
    if (message.modBrowserSounds != null) {
        console.log("Fetching Browser Sounds");

        if (Array.isArray(message.modBrowserSounds)) { // New style that supports multiple keyboard sound sets (even though the only mod I've seen doing this only ever defines one???)
            let setCount = message.modBrowserSounds.length
            let setNumber = 0;

            downloadedBrowserSounds = [] // We will store an array of keyboard sets instead of having it all be one
            for (const soundSet of message.modBrowserSounds) {
                if (soundSet.hasOwnProperty('name')) {
                    setNumber++
                    updateInstallerButtons(message.modId,`Installing sound pack ${setNumber}/${setCount}… (0%)`)
                    let currentDownloadedSounds = {
                        id: soundSet.id,
                        name: soundSet.name,
                        author: soundSet.author, // The one I saw didn't have an author section, but like.. you never know at this point.
                        sounds: {}
                    }

                    let currentNumber = 0;
                    let maxNumber = 0;
                    for (const [soundCategory, soundsArray] of Object.entries(soundSet.sounds)) {
                        for (const fileURL of soundsArray) {
                            maxNumber++
                        }
                    }

                    for (const [soundCategory, soundsArray] of Object.entries(soundSet.sounds)) {
                        console.log("fetching",soundCategory)
                        currentDownloadedSounds.sounds[soundCategory] = []
                        for (const fileURL of soundsArray) {
                            let downloadURL = `${message.modContentUrl}/${fileURL}`
                            if (fileURL != "") {
                                console.log('[GXM] Fetching',downloadURL);
                                currentNumber++
                                try {
                                    let downloadInfo = await tryToGetFile(downloadURL, fileURL, message.modContentFiles, message.modContentUrl)
                                    let downloadedFile = downloadInfo.file; let ignore = downloadInfo.ignore;
                                    if (ignore) {
                                        continue // referencing a folder, yawwwnn. should not error for this, that's the fault of the mod creator
                                    }
                                    if (rejectOnFailure && !downloadedFile) {
                                        return {
                                            succeeded: false,
                                            error: "Missing assets. Retry?",
                                            retryOffered: true
                                        }
                                    } else if (!downloadedFile) {
                                        missingCategories.keyboardSounds = true
                                    }
        
                                    let result = null
                
                                    try {
                                        let arrayBuffer = await downloadedFile.arrayBuffer()
                                        result = new Blob([arrayBuffer], {type: downloadedFile.type});
                                    } catch(error) {
                                        console.log(error);
                                    }
                
                                    if (result != null) {
                                        currentDownloadedSounds.sounds[soundCategory].push(result)
                                        updateInstallerButtons(message.modId,`Installing sound pack ${setNumber}/${setCount}… (${Math.round((currentNumber / maxNumber) * 100)}%)`)
                                    } else if (rejectOnFailure) {
                                        return {
                                            succeeded: false,
                                            error: "Failed to encode."
                                        }
                                    }
                                } catch (err) {
                                    console.log("Download error");
                                    console.log(err);
                                    return {
                                        succeeded: false,
                                        error: "Failed to download."
                                    }
                                }
                            }
                        }
                    }
                    downloadedBrowserSounds.push(currentDownloadedSounds);
                } else {
                    console.warn("This mod has weird metadata and you should really report this to the GitHub")
                    return {
                        succeeded: false,
                        error: `Odd metadata, please report this.`
                    }
                }
            }
        } else {
            updateInstallerButtons(message.modId,`Browser sounds... (0%)`)
            let currentNumber = 0;
            let maxNumber = 0;
            for (const [soundCategory, soundsArray] of Object.entries(message.modBrowserSounds)) {
                for (const fileURL of soundsArray) {
                    maxNumber++
                }
            }

            for (const [soundCategory, soundsArray] of Object.entries(message.modBrowserSounds)) {
                console.log("fetching",soundCategory)
                downloadedBrowserSounds[soundCategory] = []
                for (const fileURL of soundsArray) {
                    let downloadURL = `${message.modContentUrl}/${fileURL}`
                    if (fileURL != "") {
                        console.log('[GXM] Fetching',downloadURL);
                        currentNumber++
                        
                        try {
                            let downloadInfo = await tryToGetFile(downloadURL, fileURL, message.modContentFiles, message.modContentUrl)
                            let downloadedFile = downloadInfo.file; let ignore = downloadInfo.ignore;
                            if (ignore) {
                                continue // referencing a folder, yawwwnn. should not error for this, that's the fault of the mod creator
                            }
                            if (rejectOnFailure && !downloadedFile) {
                                return {
                                    succeeded: false,
                                    error: "Missing assets. Retry?",
                                    retryOffered: true
                                }
                            } else if (!downloadedFile) {
                                missingCategories.browserSounds = true
                            }

                            let result = null
        
                            try {
                                let arrayBuffer = await downloadedFile.arrayBuffer()
                                result = new Blob([arrayBuffer], {type: downloadedFile.type});
                            } catch(error) {
                                console.log(error);
                            }
        
                            if (result != null) {
                                downloadedBrowserSounds[soundCategory].push(result)
                                updateInstallerButtons(message.modId,`Browser sounds... (${Math.round((currentNumber / maxNumber) * 100)}%)`)
                            } else if (rejectOnFailure) {
                                return {
                                    succeeded: false,
                                    error: "Failed to encode."
                                }
                            }
                        } catch (err) {
                            console.log("Download error");
                            console.log(err);
                            return {
                                succeeded: false,
                                error: "Failed to download."
                            }
                        }
                    }
                }
            }
        }
    }

    let downloadedWebMods = {}
    if (message.modCSS != null) {
        console.log("Fetching Web Mods");
        updateInstallerButtons(message.modId,`Web mods... (0%)`)
        let currentNumber = 0;
        let maxNumber = 0;
        for (const [webMod, webData] of Object.entries(message.modCSS)) {
            let cssFiles = webData.css
            if (cssFiles != null) { // ay man, you never know
                for (const fileURL of cssFiles) {
                    maxNumber++
                }
            }
        }

        let modIndex = 0
        for (const [webMod, webData] of Object.entries(message.modCSS)) {
            console.log("fetching a web mod")
            modIndex++
            downloadedWebMods[modIndex] = {
                matches: webData.matches,
                enabled: true,
                css: [],
            }
            for (const fileURL of webData.css) {
                let downloadURL = `${message.modContentUrl}/${fileURL}`
                if (fileURL != "") {
                    console.log('[GXM] Fetching',downloadURL);
                    currentNumber++
                    try {
                        let downloadInfo = await tryToGetFile(downloadURL, fileURL, message.modContentFiles, message.modContentUrl, true)
                        let downloadedFile = downloadInfo.file; let ignore = downloadInfo.ignore;
                        if (ignore) {
                            continue // referencing a folder, yawwwnn. should not error for this, that's the fault of the mod creator
                        }
                        if (rejectOnFailure && !downloadedFile) {
                            return {
                                succeeded: false,
                                error: "Missing assets. Retry?",
                                retryOffered: true
                            }
                        } else if (!downloadedFile) {
                            missingCategories.webMods = true
                        }

                        let css = downloadedFile

                        if (css != null) {
                            // 🐺 https://github.com/opera-gaming/gxmods/blob/main/documentation/Mod_Template/webmodding/opera.css
                            // Opera GX uses env() CSS variables which aren't changeable by WebExtensions (as far as I know.)
                            // We need to do conversion on download to detect the env variables and change them to regular old
                            // CSS variables.
                            console.log(`Converting ${downloadURL}`)
                            let worked = true

                            if (worked) {
                                //const matches = findEnvVars.exec(css);
                                const editedCSS = css.replaceAll("env(-", "var(--")
                                const editedBlob = new Blob([editedCSS], {
                                    type: 'text/css' // or whatever your Content-Type is
                                });

                                downloadedWebMods[modIndex].css.push(editedBlob)
                                updateInstallerButtons(message.modId,`Web mods... (${Math.round((currentNumber / maxNumber) * 100)}%)`)
                            } else {
                                return {
                                    succeeded: false,
                                    error: "Failed to convert CSS."
                                }
                            }
                        } else if (rejectOnFailure) {
                            console.log("Got a null result");
                            return {
                                succeeded: false,
                                error: "Failed to download."
                            }
                        }
                    } catch (err) {
                        console.log("Download error");
                        console.log(err);
                        return {
                            succeeded: false,
                            error: "Failed to download."
                        }
                    }
                }
            }
        }
    }

    let downloadedThemes = {}
    if (message.modTheme != null) {
        downloadedThemes = message.modTheme // lol
    }

    let downloadedIcon = null
    if (message.modIcons != null) {
        updateInstallerButtons(message.modId,`Icon...`)
        let useIcon = Object.values(message.modIcons)[0]; // naively download the first icon we can find for now. it seems like most mods only supply "512", which is good enough for us.
        if (useIcon) {
            let downloadURL = useIcon.iconUrl
            if (downloadURL) {
                try {
                    downloadedIcon = await fetchRetryBlob(downloadURL)
                } catch (error) {
                    console.warn(`Failed to download icon: ${error}`)
                }
            }
        }
    }

    console.log("Fetched everything!");

    if (downloadedLayers.length > 0 || (Object.keys(downloadedKeyboardSounds).length > 0) || (Object.keys(downloadedBrowserSounds).length > 0) || (Object.keys(downloadedWebMods).length > 0) || (Object.keys(downloadedThemes).length > 0)) {
        let finale = await browser.runtime.sendMessage({
            intent: "installMod",
            modId: message.modId,
            modContentUrl: message.modContentUrl,
            modLayers: downloadedLayers,
            modKeyboardSounds: downloadedKeyboardSounds,
            modBrowserSounds: downloadedBrowserSounds,
            modPageStyles: downloadedWebMods,
            modTheme: downloadedThemes,
            modVersion: message.modVersion,
            modDisplayName: message.modDisplayName,
            modStorePage: message.modStorePage,
            modMangledTitle: message.modMangledTitle,
            modShortId: message.modShortId,
            modIcon: downloadedIcon
        })
        finale.missing = missingCategories
        return finale
    } else {
        return {
            succeeded: false,
            error: "Conversion failed."
        }
    }
}

async function initContentScript() {
    let installModButton = null;
    async function searchForButton() {
        console.log("[GXM] Searching for button...")
        for (const a of document.querySelectorAll(`a[data-stats-id="mod-download-gx-button"] > button`)) {
            if (a.textContent.includes("Opera GX")) {
                console.log(a.textContent)
                installModButton = a
                return true
            }
        }
        return false
    }
    let keepRetrying = true

    let modPageWallpaper = null;
    async function searchForWallpaper() {
        console.log("[GXM] Searching for wallpaper...")
        for (const a of document.querySelectorAll(`div[data-stats-id="marketplace-mod-preview-wallpaper-redirect"]`)) {
            console.log(a)
            console.log(a.textContent)
            if (a.textContent.includes("Opera GX")) {
                modPageWallpaper = a
                return true
            }
        }
        return false
    }

    searchForButton().then(function() {
        if (!installModButton) {
            var intervalId = setInterval(function() {
                searchForButton()
                if (installModButton || !keepRetrying) {
                    clearInterval(intervalId);
                }
            }, 500);
        }
    
        function waitForButton(timeout) {
            var start = Date.now();
            return new Promise(waitForFoo); 
        
            // waitForFoo makes the decision whether the condition is met
            // or not met or the timeout has been exceeded which means
            // this promise will be rejected
            function waitForFoo(resolve, reject) {
                if (installModButton)
                    resolve(installModButton);
                else if (timeout && (Date.now() - start) >= timeout)
                    reject(new Error("couldn't find button in time :/"));
                else
                    setTimeout(waitForFoo.bind(this, resolve, reject), 30);
            }
        }
        
        // This runs the promise code
        waitForButton(timeout).then(function(){
            let pathArray = window.location.pathname.split('/');
            let arrayPos = pathArray.indexOf('mods') + 1;
            let modId = pathArray[arrayPos]
            handleModButton(installModButton, modId)
        })
        .catch(function (err) {
            console.log("Giving up");
            keepRetrying = false
        });
    })

    let wallpaperRetry = true
    searchForWallpaper().then(function(){
        if (!modPageWallpaper) {
            var intervalId = setInterval(function() {
                searchForWallpaper()
                if (modPageWallpaper || !wallpaperRetry) {
                    clearInterval(intervalId);
                }
            }, 500);
        }
    
        function waitForWallpaper(timeout) {
            var start = Date.now();
            return new Promise(waitForBar); 

            function waitForBar(resolve, reject) {
                if (modPageWallpaper)
                    resolve(modPageWallpaper);
                else if (timeout && (Date.now() - start) >= timeout)
                    reject(new Error("couldn't find wallpaper in time :/"));
                else
                    setTimeout(waitForBar.bind(this, resolve, reject), 30);
            }
        }
        
        // This runs the promise code
        waitForWallpaper(timeout).then(function(){
            let pathArray = window.location.pathname.split('/');
            let arrayPos = pathArray.indexOf('mods') + 1;
            let modId = pathArray[arrayPos]
            renderWallpaper(modPageWallpaper, modId)
        })
        .catch(function (err) {
            console.log("Giving up (wallpaper)");
            wallpaperRetry = false
        });
    })
}