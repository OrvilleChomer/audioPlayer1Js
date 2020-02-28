/*

    - Loading of the file can successfully happen BEFORE user interaction occurs

    - You shouldn't try playing the file until it has finished loading (IMHO)

    - Even if you call the play() method after file is loaded, but there has been no user interaction... JavaScript will throw an error

    - This error can be trapped with a try/catch block! Yay! Perhaps loading a short "quiet" file for validation?

    - calling play() method after loading file and user interaction has happened but a break-point has been hit previously can
        result in no errors... but nothing plays either (so keep that in mind)!

    - calling pause() method after loading file (or not), before there is a user interaction will throw a trappable error just like the play()
        method!  So I can use this for testing playability without worrying about unwanted audio playing out of the speakers!

 */

function AudioPlayer() {
    console.log(" ")
    console.log("*****************************************************************")
    //console.log("🌸🌸🌸 called AudioPlayer() constructor. Starting to execute it...")

    let bAudioSupported = false;
    let playerEventHandlers = [];
   
    console.log("checking to see if window.Audio constructor is supported by this browser...")
    if ("Audio" in window) {
        bAudioSupported = true;
        //console.log("  -- window.Audio IS supported in this browser!")
    } else {
        //console.log("  -- window.Audio is NOT supported in this browser!")
    } // end if

    const aud = this;
    let bIsPlayerUsable = false;
    
    const SHORT_QUIET_AUDIO_PATH = "https://cdn.glitch.com/a2964a8f-6339-465f-8a8d-329fd8d12c43%2FblankFile.mp3?v=1580417646000";
    let testObj;
    const tracksByIndex = [];
    const tracksById = [];

    //console.log("defining the read-only audioSupported property of the aud (audioPlayer) object...")
    Object.defineProperty(aud, "audioSupported", {
        value: bAudioSupported
    });

    //console.log("defining the read-only objectType property of the aud (audioPlayer) object...")
    Object.defineProperty(aud, "objectType", {
        value: "audioPlayer"
    });


    if (!bIsPlayerUsable) {
        //console.log("in the AudioPlayer() constructor, try to see if the audio player is usable yet... can we now play audio...")
        bIsPlayerUsable = isPlayerUsable();

        if (bIsPlayerUsable) {
            //console.log("the player is now USABLE.")
        } else {
            //console.log("the player is STILL NOT USABLE!  a little later perhaps...")
        } // end if / else
    } // end if


    /***************************************************************************************************
     *  Events:
     *    "all"
     *    "fileloaded"
     *    "error"
     *    "warning"
     *    "started"
     *    "ended"
     *    "playing"
     *    "notsupported" - 
     *    "abletoplay"   - able to play audio now
     ***************************************************************************************************/
    aud.addEventListener = function(sEvent, eventHandlerToRun) {
        //console.log("aud.addEventListener() method called... event is: '"+sEvent+"'")
        const validEvents = ['all','fileloaded','error','warning','started','ended','abletoplay','trackadded'];
        setupListener(playerEventHandlers, sEvent, validEvents, eventHandlerToRun);
        
    } // end of aud.addEventListener() method


     /***************************************************************************************************
      * private function available throughout this library
      * 
      * it is called when a listened event occurs.
      * it then calls the event handler(s) assigned to it!
     ***************************************************************************************************/
    function logEvent(handlerDataSources, sEvent, sLevel, infoObj) {
        const nMax1 = handlerDataSources.length;

        for (let n1=0;n1<nMax1;n1++) {
            const handlerData = handlerDataSources[n1];

            if (typeof handlerData[sEvent] !== "undefined") {
                //console.log("found listener for this event: '"+sEvent+"'")
                infoObj.event = sEvent;
                infoObj.eventLevel = sLevel;
                infoObj.timeStamp = new Date();
                infoObj.objectType = "audioPlayerEvent";

                const eventsContainer = handlerData[sEvent];
                const handlers = eventsContainer.handlers;
                const nMax2 = handlers.length;

                for (let n2=0;n2<nMax2;n2++) {
                    const eventHandlerToRun = handlers[n2];

                    if (typeof eventHandlerToRun === "function") {
                        //console.log("about to run event handler...")
                        eventHandlerToRun(infoObj);
                    } // end if
                } // next n2
            } // end if

        } // next n2

        if (sEvent !== "all") {
            //console.log("checking for 'all' event handlers...")
            logEvent(handlerDataSources, "all", sLevel, infoObj);
        } // end if

    } // end of logEvent function logEvent()


    /***************************************************************************************************
      * private function available throughout this library
     ***************************************************************************************************/
    function setupListener(handlerData, sEvent, sValidEvents, eventHandlerToRun) {
        //console.log("setupListener()  called... event is: '"+sEvent+"'")
        const sLookup = sValidEvents.join('~');

        if (sEvent.indexOf("~") > -1) {
            console.log("tildas are not allowed in an event name!")
            return;
        } // end if

        const eventListenerObj = {};
        eventListenerObj.event = sEvent;
        eventListenerObj.eventHandler = eventHandlerToRun;
        let eventsContainer;

        if (typeof handlerData[sEvent] === "undefined") {
            eventsContainer = {};
            eventsContainer.event = sEvent;
            eventsContainer.handlers = [];
            handlerData[sEvent] = eventsContainer;
        } else {
            eventsContainer = handlerData[sEvent];
        } // end if

        eventsContainer.handlers.push(eventListenerObj);

    } // end of function setupListener()




    /***************************************************************************************************
     ***************************************************************************************************/
    aud.addTrack = function(params) {
        //console.log("addTrack() method called")
        const trk = this;
        let bAudioFileLoaded = false;
        let bTrackPlaying = false;
        let nCurrentPlayheadPos = 0;
        let nTrackLength = -1; // total length of the loaded track
        let bClipPlaying = false;
        let bItemStartedToPlay = false;
        let nTrackIndex = tracksByIndex.length;
        let trackEventHandlers = [];
        
        let playQueueByIndex = [];
        let sFilePath = getParamValue({obj:params,param:"filePath",required:true});
        let currentPlayItem;  // will be set later...
        let nDelayTimerId = -1;
        let clipsByIndex = [];
        let clipsByName = [];
        let nLastTrackPos = 0;

        let bAttemptingFileLoadOnPlay = false;
      
        const infoObj1 = {};
        infoObj1.trackObj = trk;
        infoObj1.filePath = sFilePath;
        logEvent([playerEventHandlers,trackEventHandlers], "trackadded", "player", infoObj1);
        
        //console.log(" -- about to set up the:  audioObj for this track...")
        const audioObj = new Audio(); 
        //console.log(" -- audioObj has been created.")

        //console.log("🌸🌸🌸setting up audioObj's event handlers...")
        audioObj.addEventListener('ended', donePlaying);
        audioObj.addEventListener('timeupdate', checkingPlayPos);
        audioObj.addEventListener('loadeddata', audioFileLoaded);
        //console.log("🌸🌸🌸DONE setting up audioObj's event handlers...")
      
        /*************************************************************************************************
          Some important notes on loading files using:    .src   :
          
             In [Safari] on my Mac, after setting the .src property, the file
             loads, and the 'loadeddata' event fires.
             
             On my [iPhone], after setting the .src property, the file
             does NOT load.
             
             But... after calling the play() method...
             
                - The file loads and triggers the 'loadeddata' event
                - And THEN the file begins to play!
         *************************************************************************************************/
      
        //console.log("setting up audioObj.src = '"+sFilePath+"'");
        audioObj.src = sFilePath;
        //console.log("audioObj.src is set.");

        const srcSetTimestampMs = new Date().getTime();  // Feb 3, 2020
      
        // *** CUSTOM PROPERTIES ADDED TO 'TRACK' OBJECT:
        
        //console.log("defining the read-only idx property of the trk (track) object...")
        Object.defineProperty(trk, "idx", {
            value: nTrackIndex
        });

        //console.log("defining the read-only filePath property of the trk (track) object...")
        Object.defineProperty(trk, "filePath", {
            value: sFilePath
        });

        //console.log("defining the read-only objectType property of the trk (track) object...")
        Object.defineProperty(trk, "objectType", {
            value: "track"
        });

        /***************************************************************************************************
         *  method to play/resume the current track...
         ***************************************************************************************************/
        trk.play = function() {
            //console.log("trk.play() method called")

            if (bItemStartedToPlay && bTrackPlaying === false) {
                if (bAudioSupported) {
                    audioObj.play();  // resume playing track
                } // end if

                bTrackPlaying = true;
            } else {
                
                createPlayItem({playType:"track"});
                playNextPlayItem();
            } // end if
           
        } // end of play() method


        /***************************************************************************************************
         *  method to stop playing whatever might have been playing and start playing the track
         *  from the beginning
         ***************************************************************************************************/
        trk.playNow = function() {
            //console.log("trk.playNow() method called")
            if (nDelayTimerId !== -1) {
                clearTimeout(nDelayTimerId);
                myConsole.log("timeout cleared.")
                nDelayTimerId = -1;
            } // end if
            
            if (bTrackPlaying || bClipPlaying) {
                //console.log("about to pause audioObj...")
                audioObj.pause();
                //console.log("audioObj paused.")
                bTrackPlaying = false;
                bClipPlaying = false;
            } // end if

            bItemStartedToPlay = false;
            //console.log("about to clear: playQueueByIndex[]...")
            playQueueByIndex = [];  // clear out anything that might be in the queue
            createPlayItem({playType:"track"});
            playNextPlayItem();
        } // end of trk.playNow() method



        /***************************************************************************************************
         *   pause playing of track (if it is currently playing)
         ***************************************************************************************************/
        trk.pause = function() {
            //console.log("trk.pause() method called")

            if (!bTrackPlaying) {
                //console.log("no track playing so leaving method...")
                return;
            } // end if

            bTrackPlaying = false;
            audioObj.pause();
        } // end of pause() method


        /***************************************************************************************************
         *  pause playing of track and reset playhead position to zero (0)
         ***************************************************************************************************/
        trk.stop = function() {
            //console.log("trk.stop() method called")
        } // end of stop() method


        /***************************************************************************************************
         ***************************************************************************************************/
        trk.addClip = function(params) {
            //console.log("trk.addClip() method called")
            const clip = this;
            let clipEventHandlers = [];
            let nClipIndex = clipsByIndex.length;
//debugger;
            let nStartPos = getParamValue({obj:params,param:"startPos",dataType:"number"});
            let nEndPos = getParamValue({obj:params,param:"endPos",dataType:"number",defaultValue:nStartPos+2});

            if (nEndPos < nStartPos) {
                //console.log("endPos < startPos.... swapping...")
                let nTempVal = nStartPos;
                nStartPos = nEndPos;
                nEndPos = nTempVal;
            } // end if

            let nDuration;

            if (nEndPos>0) {
                nDuration = nEndPos - nStartPos;
            } else {
                nDuration = getParamValue({obj:params,param:"duration",dataType:"number",defaultValue:2});
                nEndPos = nStartPos + nDuration;
            } // end if/else

            if (nStartPos < 0) {
                nStartPos = 0;
            } // end if

            if (nTrackLength === -1) {
                nTrackLength = audioObj.duration;
            } // end if

            if (nEndPos > nTrackLength) {
                nEndPos = nTrackLength;
            } // end if

            let sClipName = "clip"+(nClipIndex+1);
            //console.log("Default new clip name: <b>"+sClipName+"</b>");
            sClipName = getParamValue({obj:params,param:"clipName",defaultValue:sClipName,dataType:"string"});

            if (typeof clipsByName[sClipName] !== "undefined") {
                //console.log("duplicate clip name... exiting...");
                return;
            } // end if

            let bPlayingClip = false;

            // **** CUSTOM OBJECT PROPERTIES:
            
            //console.log("defining the read-only idx property of the clip object...")
            Object.defineProperty(clip, "idx", {
                value: nClipIndex
            });

            //console.log("defining the read-only objectType property of the clip object...")
            Object.defineProperty(clip, "objectType", {
                value: "clip"
            });

            //console.log("defining the read-only objectType property of the clip object...")
            Object.defineProperty(clip, "clipName", {
                value: sClipName
            });
            
            /***************************************************************************************************
             *  play current clip as long as nothing else on the track is not currently playing
             ***************************************************************************************************/
            clip.play = function() {
                //console.log("clip.play() method called")
                if (bItemStartedToPlay && bPlayingClip === false) {
                    console.log("🎧resume playing the clip...")
                    bPlayingClip = true;
                    nLastTrackPos = currentPlayItem.startPos;
                    audioObj.play();
                } else {
                    console.log("🎧 🎧 🎧 potentially begin to play the clip....")
                    const params2 = {};
                    params2.playType = "clip";
                    params2.startPos = nStartPos;
                    params2.endPos = nEndPos;
                    createPlayItem(params2);
                    playNextPlayItem();
                } // end if/else
               
            } // end of clip.play() method


            /***************************************************************************************************
             *   pause playing of clip (if it is currently playing)
             ***************************************************************************************************/
            clip.pause = function() {
                //console.log("clip.pause() method called")
                if (bPlayingClip) {
                    bPlayingClip = false;
                    audioObj.pause();
                } // end if
            } // end of clip.pause() method


            /***************************************************************************************************
             *  pause playing of clip and reset playhead position to zero (0)
             *  
             *  NOTE: the clip is [still] considered the current play item.
             ***************************************************************************************************/
            clip.stop = function() {
                //console.log("clip.stop() method called")

                if (bPlayingClip) {
                    bPlayingClip = false;
                    bItemStartedToPlay = false;
                    audioObj.pause();
                    audioObj.currentTime = currentPlayItem.startPos;
                } // end if

            } // end of clip.stop() method


            /***************************************************************************************************
             *   tell the clip to delete itself... 🙂
             ***************************************************************************************************/
            clip.deleteItem = function() {
                //console.log("clip.deleteItem() method called")
            } // end of clip.deleteItem() method


        } // end of addClip() method
        // ==================================================================================================
        // ==================================================================================================



        /***************************************************************************************************
         *  return an array of clip objects there are for the current track
         ***************************************************************************************************/
        trk.getClips = function(params) {
            //console.log("trk.getClips() method called")
        } // end of getClips() method


        /***************************************************************************************************
         *  delete clips in this track based on filter values
         ***************************************************************************************************/
        trk.deleteClips = function(params) {
            //console.log("trk.deleteClips() method called")
        } // end of deleteClips() method

        /***************************************************************************************************
         *   tell the track to delete itself... 🙂
         ***************************************************************************************************/
        trk.deleteItem = function() {
            //console.log("trk.deleteItem() method called")
        } // end of deleteItem() method

        /***************************************************************************************************
         *  below is called when "loadeddata" event is triggered
         ***************************************************************************************************/
        function audioFileLoaded(evt) {
            //console.log("🌸🌸🌸 <b>audioFileLoaded()</b> event handler called for audioObj 'loadeddata' event...")
            //console.log('audioPlayer: audio file is loaded!')

            if (evt.currentTarget.id === "testObj") {
                //console.log('📌📌 test object loaded... exiting...')
                return;
            } // end if

            bAudioFileLoaded = true;
            //console.log('bAudioFileLoaded flag set to true!')

            nTrackLength = audioObj.duration;
            //console.log("track length set: "+nTrackLength)
           
            checkingForFileLoadOnPlayEvent();
          
            playNextPlayItem(); // play next play  item (if there is any item)

        } // end of function audioFileLoaded()


        /***************************************************************************************************
         *  hack for iOS Safari as of Feb 2020
         *
         *  Called from:
         *           audioFileLoaded()  -- first line of defense
         *           checkingPlayPos()  -- second line of defense
         *           donePlaying()      -- in case fires before chance of anything else!
         ***************************************************************************************************/
        function checkingForFileLoadOnPlayEvent() {
          
          if (!bAttemptingFileLoadOnPlay) {
            return; // not attempting
          } // end if
          
          if (audioObj.playing) {
            audioObj.pause();
          } // end if
          
          audioObj.muted = false;   // unmute!
          audioObj.currentTime = 0; // set pointer back to the beginning
          bAttemptingFileLoadOnPlay = false;
          
        } // end of function checkingForFileLoadOnPlayEvent() 
      
      
        /***************************************************************************************************
         *  below is called when "ended" event is triggered
         *  or... when checkingPlayPos() calls it!!
         ***************************************************************************************************/
        function donePlaying(evt) {
            //console.log("donePlaying() event handler called for audioObj 'ended' event...")
            //console.log('audioPlayer: track finished playing')

            if (!bTrackPlaying && !bClipPlaying && !bPlayingClip) {
                //console.log('nothing supposedly is actually playing so exit donePlaying() function')
                return;
            } // end if

            bTrackPlaying = false;
            bClipPlaying = false;
            bPlayingClip = false;
            bItemStartedToPlay = false;

            checkingForFileLoadOnPlayEvent();
          
            try {
                //console.log('about to call the audioObj.pause() method')
                audioObj.pause();
                //console.log('calling audioObj.pause() succeeded!')
            } catch(err) {
                console.log('calling audioObj.pause() failed!')
                console.log(err);
            } // end of try/catch

            currentPlayItem = undefined;
            playNextPlayItem(); // play next play  item (if there is any item)

        } // end of function donePlaying()


        /***************************************************************************************************
         *  below is called when "timeupdate" event is triggered
         *  here we can check if the current play item has finished playing...
         ***************************************************************************************************/
        function checkingPlayPos(evt) {
            //console.log("checkingPlayPos() event handler called for audioObj 'timeupdate' event...")
            //console.log("audioPlayer: player's play-head position changed")
            //console.log("new play position: "+audioObj.currentTime);
            if (typeof currentPlayItem === "undefined") {
                //console.log("'currentPlayItem' is undefined... exiting checkingPlayPos()...")
                return;
            } // end if
          
            checkingForFileLoadOnPlayEvent();

            if (currentPlayItem.endPos === -1) {
                // fix play item that was added Before audio file had finished loading
                currentPlayItem.endPos = nTrackLength;
                //console.log("endPos fixed: "+nTrackLength)
            } // end if

            /**************************************************************************************************
               I've determined that the "timeupdate" event fires rather inconsistently.
               it can fire (rounded a bit) .10 seconds apart, .25 seconds apart... who knows???

               Bottom line: its not precise!!

               I think I want about 1 full second of dead space in the track between each clip to prevent the playing of any
               part of the next clip if this event doesn't catch the end of the current clip fast enough!

             **************************************************************************************************/
            const nSpacing = audioObj.currentTime - nLastTrackPos;
            //console.log("spacing: "+nSpacing)
            nLastTrackPos = audioObj.currentTime;

            if (audioObj.currentTime >= currentPlayItem.endPos ) {
                //console.log("audioObj.currentTime="+audioObj.currentTime);
                //console.log("currentPlayItem.endPos="+currentPlayItem.endPos);
                //console.log('looks like we have reached the end the playitem... gonna call donePlaying()')
                donePlaying(evt);
            } // end if

        } // end of function checkingPlayPos()


        /***************************************************************************************************
         *   - no params... 
         *        - startPos = 0
         *        - endPos = nTrackLength
         * 
         *  - startPos
         *  - endPos
         *  - delay (in seconds)
         ***************************************************************************************************/
        function createPlayItem(params) {
            //console.log("createPlayItem() called")
            const playItem = {};

            playItem.playType = getParamValue({obj:params,param:"playType",dataType:"string",defaultValue:"track"});
            playItem.startPos = getParamValue({obj:params,param:"startPos",dataType:"number"})
            playItem.endPos = getParamValue({obj:params,param:"endPos",dataType:"number",defaultValue:nTrackLength})
            playItem.delay = getParamValue({obj:params,param:"delay",dataType:"number"});  // in seconds...

            playQueueByIndex.push(playItem);
        } // end of function createPlayItem()


        /***************************************************************************************************
         *  
         ***************************************************************************************************/
        function playNextPlayItem() {
            //console.log("*** 🔊playNextPlayItem() 🔊 called")
            if (playQueueByIndex.length === 0) {
                //console.log("playQueueByIndex is empty. exiting function...")
                return;
            } // end if

          //audioObj.currentTime
            const currentTimestampMs = new Date().getTime(); 
            
            if (!bAudioFileLoaded && currentTimestampMs - srcSetTimestampMs > 1000) {
              //console.log("no file loaded event has fired in quite some time since .src set!")
              bAttemptingFileLoadOnPlay = true;
              
              try {
                audioObj.muted = true;
                audioObj.play(); // on iOS will trigger file to load that is specified in the .src property
              } catch(err) {
                bAttemptingFileLoadOnPlay = false;
                audioObj.muted = false;
              } // end of try/catch block
              
              
            } // end if
          
            if (!bAudioFileLoaded) {
              //console.log("bAudioFileLoaded="+bAudioFileLoaded)
              //console.log("exiting function")
              return;
            } // end if
          
            if (bTrackPlaying || bClipPlaying) {
              myConsole.log("somethings still playing...exiting function")
              return;
            } // end if
          
            //console.log("   playNextPlayItem() - got this far (1)")
            if (!bIsPlayerUsable) {
                bIsPlayerUsable = isPlayerUsable();

                if (!bIsPlayerUsable) {
                    setTimeout(playNextPlayItem, 50); // wait a little bit and try again...
                    return;
                } // end if
                //console.log("audio player is now usable.")
            } // end if

            //console.log("retrieving first item of the play queue...")
            currentPlayItem = playQueueByIndex.shift();

            sPlayType = currentPlayItem.playType;
            bItemStartedToPlay = true;

            if (sPlayType === "track") {
                bTrackPlaying = true;
                //console.log("next item to play is a Track")
            } // end if

            if (sPlayType === "clip") {
                bClipPlaying = true; // track level
                bPlayingClip = true; // clip level
                myConsole.log("next item to play is a Clip")
            } // end if

            if (currentPlayItem.delay === 0) {
                playNextPlayItem2();
            } else {
                nDelayTimerId = setTimeout(playNextPlayItem2, currentPlayItem.delay * 1000);
            } // end if / else

        } // end of function playNextPlayItem()



        /***************************************************************************************************
         *  
         ***************************************************************************************************/
        function playNextPlayItem2() {
            //console.log("function playNextPlayItem2() called...")
            nDelayTimerId = -1;
            nLastTrackPos = currentPlayItem.startPos;
            audioObj.currentTime = currentPlayItem.startPos;
          
            try {
              audioObj.play();
            } catch(err) {
              
            } // end of try/catch block
          
        } // end of function playNextPlayItem2()



        tracksByIndex.push(trk);
        //console.log("trk object was added to tracksByIndex[] array...");

        //console.log("we have reached the End of the addTrack() method!")
    } // end of addTrack() method


    /***************************************************************************************************
     * returns an array of track objects that currently reside in the player
     * you can filter the list using various parameters
     ***************************************************************************************************/
    aud.getTracks = function(params) {

    } // end of getTracks() method


    /***************************************************************************************************
     ***************************************************************************************************/
    aud.deleteTracks = function(params) {

    } // end of deleteTracks() method


    /***************************************************************************************************
     ***************************************************************************************************/
    aud.stopPlaying = function(params) {

    } // end of stopPlaying() method


    /***************************************************************************************************
     ***************************************************************************************************/
    aud.pausePlaying = function(params) {
        
    } // end of pausePlaying() method

    /***************************************************************************************************
     ***************************************************************************************************/
    aud.resumePlaying = function(params) {
        
    } // end of resumePlaying() method




    //**** PRIVATE FUNCTIONS */

    function isPlayerUsable() {
        //console.log("function isPlayerUsable() called...")

        if (typeof testObj === "undefined") {
            myConsole.log("testObj undefined... instantiating testObj...")
            testObj = new Audio(); 

            // ** do i actually NEED an event handler here??
            testObj.id = "testObj";
            testObj.src = SHORT_QUIET_AUDIO_PATH; // needs to happen for test to work.
        } // end if

        try {
          //console.log("about to try to call pause() method... to see if API allows it...")
          testObj.pause();  // we can cause pause() without needing to call play() first for our check 😁
          //console.log("pause() method succeeded... returning [true] ... audio player is playable!")
          return true;
        } catch(err) {
            //console.log("Error on pause() method - user interaction must not have occurred just yet!  ... returning [false]")
            return false;
        } // end of try / catch block

    } // end of function isPlayerUsable()

// getParamValue({obj:params,param:"startPos",dataType:"number"})
    function getParamValue(params) {
        if (typeof params !== "object") {
            //console.log('not passing in an object to getParamValue() function!');
            return "??syntax??";
        } // end if

        let vDefaultValue = "";
        let vValue = vDefaultValue;
        let sDataType = "variant";
        let obj;
        let bRequiredField = false;

        if (typeof params.obj !== "object") {
            //console.log('not providing in an object in "obj" parameter!');
            return "??syntax??";
        } else {
            obj = params.obj;
        } // end if

       
        if (typeof params.required === "boolean") {
            bRequiredField = params.required;
        } // end if

        // 'param' is the actual name of the parameter...
        if (typeof params.param !== "string") {
            myConsole.log('not correctly providing a parameter name in the "param" parameter!');
            return "??syntax??";
        } // end if

        if (typeof params.dataType === "string") {
            sDataType = params.dataType;

            if (sDataType === "number") {
                vDefaultValue = 0;
            } // end if

            if (sDataType === "boolean") {
                vDefaultValue = false;
            } // end if

        } // end if

        if (typeof params.defaultValue !== "undefined") {
            if (typeof params.defaultValue === sDataType || sDataType === "variant") {
                vDefaultValue = params.defaultValue;
            } else {
                //console.log(params.param+": invalid data type for default value")
                //console.log("Data type should be: "+sDataType)
                //console.log("It actually is: <b>"+typeof params.defaultValue+"</b>")
                return "??dataType??";
            } // end if/else

        } // end if

       // debugger;
        vValue = obj[params.param];

        if (typeof vValue === "undefined" && !bRequiredField) {
            vValue = vDefaultValue;
        } // end if

        if (typeof vValue !== sDataType && sDataType !== "variant") {
            //console.log("invalid data type")
            return "??dataType??";
        } // end if

        return vValue;
    } // end of function getParamValue()

} // end of constructor function AudioPlayer()


//console.log("about to instantiate audioPlayer object... from AudioPlayer() constructor...")
const audioPlayer = new AudioPlayer();
