var adElement = "#ap_iframe";
var voiceChatEnabled = false;
var chatLogDragged = false;
let joined = false;
let color = "";
let techy = "";
let mod_code = "";
let dev_code = "";
let typingTimeout;
let typing = false;
let espeaktts = false;

const { entries, values } = Object;
const { isArray } = Array;
const { seedrandom, random, floor } = Math;
const MIN_DECIBELS = -45;
$(function () {
    $(window).load(updateAds);
    $(window).resize(updateAds);
    $("body").on("DOMNodeInserted", adElement, updateAds);
    $("body").on("DOMNodeRemoved", adElement, updateAds);
});

function initSettings() {
    localStorage.imageBlacklist = localStorage.imageBlacklist || "false";
    localStorage.classicBg = localStorage.classicBg || "false";
    localStorage.wordBlacklist = localStorage.wordBlacklist || "[]";
}
function evilBonziSpeak(string) {
    
                            let url = `./voiceforge?text=${encodeURIComponent(string)}&voice=Damien`;
                            this.audio = new Audio(url);
                            this.audio.playbackRate = 1;
                            this.audio.preservesPitch = false;
                            this.audio.agents = true;
                            this.audio.play();
}

function xpath(el, expr) {
    let result = el.getRootNode().evaluate(expr, el);
    switch (result.resultType) {
        case XPathResult.BOOLEAN_TYPE:
            return result.booleanValue;
        case XPathResult.NUMBER_TYPE:
            return result.numberValue;
        case XPathResult.STRING_TYPE:
            return result.stringValue;
        case XPathResult.UNORDERED_NODE_ITERATOR_TYPE:
            let list = [];
            let node;
            while ((node = result.iterateNext())) {
                list.push(node);
            }
            return list;
    }
}

function exportSettings() {
    let xml = `<?xml version="1.0"?>
<settings>
    <hideImages on="${localStorage.hideImages === "true"}"/>
    <classicBg on="${localStorage.classicBg === "true"}"/>
`;
    let wordBlacklist = JSON.parse(localStorage.wordBlacklist);
    if (wordBlacklist.length > 0) {
        xml += "    <blacklist>\n";
        for (let word of wordBlacklist) {
            xml += `        <word>${sanitize(word)}</word>\n`;
        }
        xml += "    </blacklist>\n";
    }
    xml += "</settings>";
    return xml;
}

function importSettings(xml) {
    let parser = new DOMParser();
    let settingsXML = parser.parseFromString(xml, "application/xml");
    let settings = settingsXML.documentElement;
    if (settingsXML.querySelector("parsererror")) {
        throw Error(`Parser error: ${settingsXML.querySelector("parsererror").textContent}`);
    } else if (settings.tagName !== "settings") {
        throw Error(`Root tag is <${settings.tagName}>, not <settings>`);
    }
    initSettings();
    localStorage.hideImages = xpath(settings, "string(./hideImages/@on)") === "true";
    localStorage.classicBg = xpath(settings, "string(./classicBg/@on)") === "true";
    wordBlacklist = [];
    for (let word of xpath(settings, "./blacklist/word")) {
        wordBlacklist.push(word.textContent);
    }
    localStorage.wordBlacklist = JSON.stringify(wordBlacklist);

    document.body.classList.toggle("classic", localStorage.classicBg === "true");
}

let settingsDialog;

function openSettings() {
    if (settingsDialog) {
        settingsDialog.element.remove();
    }
    settingsDialog = new Dialog({
        title: "Settings",
        class: "settings",
        html: `
            <div>
                <label><input type="checkbox" class="hide"> Hide Images</label><br>
                <label><input type="checkbox" class="classic"> Classic Background Color</label><br>
                <label><input type="checkbox" class="custom-tts"> Turn off Custom TTS</label>
            </div>  
            <div class="blacklist">
                <header>Blacklisted words: </header>
                <textarea class="blacklist_words" placeholder="Newline-seperated list of blacklisted words."></textarea>
            </div>
            <div class="button_row">
                <button class="import">Import</button>
                <button class="export">Export</button>
            </div>
        `,
        width: 600,
        height: 400,
        x: 20,
        y: 20,
    });
    let element = settingsDialog.element;
    let hideImages = element.querySelector(".hide");
    let classicBg = element.querySelector(".classic");
    let customtts = element.querySelector(".custom-tts");
    let blacklist = element.querySelector(".blacklist_words");
    let add = element.querySelector(".add");
    hideImages.checked = localStorage.hideImages === "true";
    classicBg.checked = localStorage.classicBg === "true";
    customtts.checked = localStorage.customTTS === "true";
    hideImages.oninput = () => {
        localStorage.hideImages = hideImages.checked;
    };
    classicBg.oninput = () => {
        localStorage.classicBg = classicBg.checked;
        document.body.classList.toggle("classic", classicBg.checked);
    };
    customtts.oninput = () => {
        localStorage.customTTS = customtts.checked;
    };
    blacklist.value = wordBlacklist.join("\n");
    blacklist.oninput = () => {
        let words = blacklist.value.split("\n");
        wordBlacklist = [];
        for (let word of words) {
            word = word.trim();
            if (word.length > 0) {
                wordBlacklist.push(word);
            }
        }
        localStorage.wordBlacklist = JSON.stringify(wordBlacklist);
    };
    element.querySelector(".export").onclick = () => {
        exportWindow();
    };
    element.querySelector(".import").onclick = () => {
        importWindow();
    };
}

function exportWindow() {
    let dialog = new Dialog({
        title: "Export Settings",
        class: "export_window",
        html: `
            <textarea class="export fill" readonly></textarea>
        `,
        width: 400,
        height: 300,
        x: 100,
        y: 100,
    });
    let element = dialog.element;
    let exportText = element.querySelector(".export");
    exportText.value = exportSettings();
    exportText.focus();
}

function importWindow() {
    let dialog = new Dialog({
        title: "Import Settings",
        class: "import_window",
        html: `
            <textarea class="import fill" placeholder="Paste your settings here."></textarea>
            <div class="button_row">
                <button class="import_button">Import</button>
            </div>
        `,
        width: 400,
        height: 300,
        x: 100,
        y: 100,
    });
    let element = dialog.element;
    let importText = element.querySelector(".import");
    importText.focus();
    element.querySelector(".window_close").onclick = () => {
        dialog.element.remove();
    };
    element.querySelector(".import_button").onclick = () => {
        let text = importText.value;
        try {
            let lastX = settingsDialog.x;
            let lastY = settingsDialog.y;
            importSettings(text);
            openSettings();
            settingsDialog.move(lastX, lastY);
        } catch (err) {
            new Dialog({
                title: "Error",
                class: "flex_window",
                html: `<div class="fill center"><span>${markup(err.message)}</span></div>`,
                width: 400,
                height: 200,
                x: 100,
                y: 100,
            });
        }
    };
}

// utopia. c:
let wordBlacklist = [];

function theme(a) {
    document.getElementById("theme").innerHTML = a;
}

let quote = null;
let lastUser = "";

function time() {
    let date = new Date();
    let hours = date.getHours();
    let minutes = date.getMinutes();
    let hourString = String(hours % 12).padStart(2, "0");
    let minuteString = String(minutes).padStart(2, "0");
    let ampm = hours >= 12 ? "PM" : "AM";
    return `${hourString}:${minuteString} ${ampm}`;
}

let rules = {
    "**": "b",
    "~~": "i",
    "--": "s",
    __: "u",
    "``": "code",
    "^^": "gay-big", // these are fine
    $r$: "gay-rainbow",
    "||": "gay-spoiler",
};

function markup(text) {
    text = text.replace(/(^|\\n)(&gt;.*?)($|\\n)/g, '$1<span class="greentext">$2</span>$3').replaceAll("\\n", "<br>");
    for (let [token, tag] of entries(rules)) {
        let closing = false;
        while (text.includes(token)) {
            text = text.replace(token, closing ? `</${tag}>` : `<${tag}>`);
            closing = !closing;
        }
        if (closing) {
            text += `</${tag}>`;
        }
    }
    return text;
}

function nmarkup(text) {
    while (text.includes("^^") || text.includes("||") || text.includes("\\n")) {
        text = text.replaceAll("^^", "").replaceAll("||", "").replaceAll("\\n", "");
    }
    return markup(text);
}

function bonzilog(id, name, html, color, text, single) {
    // hacky
    // remind me to rewrite this as this is the biggest peice of dogshit
    let icon = "";
    let scrolled = chat_log_content.scrollHeight - chat_log_content.clientHeight - chat_log_content.scrollTop <= 20;
    if (color) {
        let [baseColor, ...hats] = color.split(" ");
        icon = `<div class="log_icon">
            <img class="color" src="img/pfp/${baseColor}.png">
            ${hats.map(hat => `<img class="hat" src="img/pfp/${hat}.png">`).join(" ")
            }
        </div>`;
    } else {
        icon = `<div class="log_left_spacing"></div>`;
    }
    let thisUser = `${id};${name};${color}`;
    if (thisUser !== lastUser || single) {
        let timeString = `<span class="log_time">${time()}</span>`;
        chat_log_content.insertAdjacentHTML("beforeend", `
            <hr>
            <div class="log_message">
                ${icon}
                <div class="log_message_cont">
                    <div class="reply"></div>
                    <span><b>${nmarkup(name)}</b> ${name ? timeString : ""}</span>
                    <div class="log_message_content">${html} ${name ? "" : timeString}</div> 
                </div>
            </div>`);
        lastUser = single ? "" : thisUser;
    } else {
        chat_log_content.insertAdjacentHTML("beforeend", `
            <div class="log_message log_continue">
                <div class="reply"></div>
                <div class="log_left_spacing"></div>
                <div class="log_message_cont">
                    <div class="log_message_content">${html}</div>
                </div>
            </div>`);
    }
    chat_log_content.lastChild.querySelector(".reply").onclick = () => {
        quote = { name, text: text };
        talkcard.innerHTML = `Replying to ${nmarkup(name)}`;
        chat_message.focus();
        talkcard.hidden = false;
    };
    if (scrolled) {
        chat_log_content.scrollTop = chat_log_content.scrollHeight;
    }
}
let lastZ = 1;
let dragged = null;
let dragX = 0;
let dragY = 0;

function sanitize(text) {
    return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}
class Dialog {
    constructor(opt = {}) {
        if (opt.title == null) opt.title = "Window";
        opt.width = opt.width || 400;
        opt.height = opt.height || 300;
        this.x = opt.x || 0;
        this.y = opt.y || 0;
        this.element = document.createElement("div");
        this.element.classList.add("window");
        if (opt.class) this.element.classList.add(opt.class);
        this.element.innerHTML = `
        <div class="window_header">
        ${sanitize(opt.title)}
        <div class="window_close"></div>
        </div>
        <div class="window_body"></div>
        `;
        this.move(this.x, this.y);
        this.element.style.position = "absolute";
        this.element.style.zIndex = lastZ++ + 9999;
        this.element.querySelector(".window_header").onpointerdown = (e) => {
            dragged = this;
            dragX = e.pageX - this.x;
            dragY = e.pageY - this.y;
        };
        this.element.querySelector(".window_close").onclick = () => {
            this.element.remove();
        };
        this.element.style.width = `${opt.width}px`;
        this.element.style.height = `${opt.height}px`;
        this.element.querySelector(".window_body").innerHTML = opt.html;
        content.appendChild(this.element);
    }

    move(x, y) {
        this.x = x;
        this.y = y;
        this.element.style.left = `${x}px`;
        this.element.style.top = `${y}px`;
    }
}

function helpPopup() {
    new Dialog({
        title: "Help Menu",
        class: "flex_window",
        html: `<iframe src="../readme.html" style="width: 100%; height: 100%;"></iframe>`,
        x: 300,
        y: 400,
        width: 600,
        height: 400,
    });
}

function updateAds() {
    var height = $(window).height() - $(adElement).height();
    var hideAd = height <= 250;
    if (hideAd) height = $(window).height();
    $(adElement)[hideAd ? "hide" : "show"]();
    $("#content").height(height);
}
function parseAudioTag(line) {
    const audioTagMatch = line.match(/\[audio=(.+?)\]$/);
    const audioUrl = audioTagMatch ? audioTagMatch[1] : null;
    const cleanText = audioTagMatch ? line.replace(audioTagMatch[0], "").trim() : line.trim();

    return { cleanText, audioUrl };
}
function removeBackslashEnclosedText(text) {
    // The regular expression:
    // \\: Matches a literal backslash. We need to escape it because \ is a special character in regex.
    // (.*?): This is the capturing group.
    //    . : Matches any character (except newline).
    //    *?: Matches the preceding character zero or more times, non-greedily (as few as possible).
    //         This is crucial to ensure it matches only up to the *next* backslash, not the last one in the string.
    // \\: Matches the literal closing backslash.
    const regex = /\\(.*?)\\/g;

    // Replace all occurrences (due to 'g' flag) of the pattern with an empty string
    return text.replace(regex, "");
}

function isValidColor(value) {
    const validColors = [
        "black", "blue", "brown", "green", "purple",
        "red", "pink", "yellow", "white", "cyan",
        "pope", "ban", "blessed"
    ];

    return validColors.includes(value);
}

class Agent {
    constructor(id, userPublic) {
        // ========================================================================
        // VARIABLES/CONSTANTS
        // ========================================================================
        this.userPublic = userPublic || {
            name: "Clippit",
            color: "clippit",
            speed: 175,
            pitch: 50,
            voice: "en-US",
            tag: ""
        };
        this.leaving = false;
        this.voiceChat = false;
        this.lastFrame = 9999;
        this.color = this.userPublic.color;
        this.colorPrev;
        this.data = window.AgentData;
        this.overlayOffset = { left: 0, top: 0 };
        this.drag = false;
        this.dragged = false;

        this.eventQueue = [];

        this.eventRun = true;
        this.event = null;

        this.willCancel = false;

        this.run = true;

        this.mute = false;
        this.playbackRate = 1;
        this.eventTypeToFunc = {
            anim: "updateAnim",
            html: "updateHTML",
            text: "updateHTML",
            idle: "updateIdle",
            add_random: "updateRandom",
        };

        // ========================================================================
        // ASSIGN ID
        // http://stackoverflow.com/a/105074
        // ========================================================================

        if (typeof id == "undefined") {
            this.id = s4() + s4();
        } else this.id = id;

        this.rng = new Math.seedrandom(this.seed || this.id || Math.random());
        this.abortController = new AbortController();

        // ========================================================================
        // HTML POPULATION
        // ========================================================================
        this.selContainer = "#content";
        this.$container = $(this.selContainer);

        this.$container.append(`
			<div id='agent_${this.id}' class='agent'>
				<pre class='agent_tag'></pre>
				<div class='agent_name'> <i class='typing' hidden>(typing)</i></div>
				<div class='agent_placeholder'></div>
				<div style="display: none;" class="bubble">
					<p class="bubble-content"></p>
				</div>
			</div>
		`);

        this.selElement = "#agent_" + this.id;
        this.selDialog = this.selElement + " > .bubble";
        this.selDialogCont = this.selElement + " > .bubble > p";
        this.selNametag = this.selElement + " > .agent_name";
        this.selTag = this.selElement + " > .agent_tag";

        this.selCanvas = this.selElement + " > .agent_placeholder";
        this.selOldCanvas = this.selElement + " > .agent_placeholder";
		this.selCross = this.selElement + " > .cross";
        $(this.selCanvas).width(this.data.size.x).height(this.data.size.y);

        this.$element = $(this.selElement);
        this.$canvas = $(this.selCanvas);
        this.$cross = $(this.selCross);
        this.$dialog = $(this.selDialog);
        this.$dialogCont = $(this.selDialogCont);
        this.$nametag = $(this.selNametag);
        this.$tag = $(this.selTag);
        this.$canvas.attr("draggable", "false");
        this.$oldCanvas = $(this.selOldCanvas);
        // backwards compatibility
        this.element = document.getElementById("agent_" + this.id);

        this.updateName();
        this.updateTag();

        $.data(this.$element[0], "parent", this);

        this.updateSprite(true);

        // ========================================================================
        // EVENTS
        // ========================================================================
        this.generate_event = function (a, b, c) {
            // Selector, event, function
            a[b]((e) => {
                this[c](e);
            });
        };

        this.generate_event(this.$canvas, "mousedown", "mousedown");
        this.generate_event(this.$cross, "mousedown", "mousedown");

        this.generate_event($(window), "mousemove", "mousemove");

        this.generate_event($(window), "mouseup", "mouseup");

        var coords = this.maxCoords();
        this.x = coords.x * this.rng();
        this.y = coords.y * this.rng();
        this.move();

        // ========================================================================
        // MENU
        // ========================================================================

        $.contextMenu({
            selector: this.selCanvas,
            build: ($trigger, e) => {
                let extra = {};
                if (authlevel == 4 && window.location.hostname != "localhost") { // not for the cute and chubby catgirl. I'm saving myself from mistakes.
                    // coded like a true React programmer
                    extra = {
                        bless: {
                            name: "Bless",
                            callback: () => {
                                socket.emit("command", {
                                    list: ["bless", this.id],
                                });
                            },
                        },
                        kick: {
                            name: "Kick",
                            callback: () => {
                                socket.emit("command", {
                                    list: ["kick", this.id],
                                });
                            },
                        },
                        nuke: {
                            name: "Nuke",
                            callback: () => {
                                socket.emit("command", {
                                    list: ["nuke", this.id],
                                });
                            },
                        },
                    };
                }
                if (authlevel == 2 && window.location.hostname != "localhost") { // not for the cute and chubby catgirl. I'm saving myself from mistakes.
                    // coded like a true React programmer
                    extra = {
                        bless: {
                            name: "Bless",
                            callback: () => {
                                socket.emit("command", {
                                    list: ["bless", this.id],
                                });
                            },
                        }
                    };
                }
                if (authlevel == 3 && window.location.hostname != "localhost") { // not for the cute and chubby catgirl. I'm saving myself from mistakes.
                    // coded like a true React programmer
                    extra = {
                        bless: {
                            name: "Bless",
                            callback: () => {
                                socket.emit("command", {
                                    list: ["bless", this.id],
                                });
                            },
                        },
                        kick: {
                            name: "Kick",
                            callback: () => {
                                socket.emit("command", {
                                    list: ["kick", this.id],
                                });
                            },
                        },
                        nuke: {
                            name: "Nuke",
                            callback: () => {
                                socket.emit("command", {
                                    list: ["nuke", this.id],
                                });
                            },
                        }
                    };
                }
                return {
                    items: {
                        cancel: {
                            name: "Cancel / Interrupt",
                            callback: () => {
                                this.cancel();
                            },
                        },
                        mute: {
                            name: () => (this.mute ? "Unmute" : "Mute"),
                            callback: () => {
                                this.stopSpeaking();
                                this.$dialog.fadeOut(150);
                                this.$dialogCont.html("");
                                this.mute = !this.mute;
                                var _this = this;
                                if (_this.mute == true) {
                                    this.sprite.gotoAndPlay("muted_fwd");
                                } else {
                                    this.sprite.gotoAndPlay("muted_back");
                                }
                            },
                        },
                        asshole: {
                            name: "Call an Asshole",
                            callback: () => {
                                socket.emit("command", { list: ["asshole", this.userPublic.name] });
                            },
                        },
                        owo: {
                            name: "Notice Bulge",
                            callback: () => {
                                socket.emit("command", { list: ["owo", this.userPublic.name] });
                            },
                        },
                        call: {
                            name: `Hey, ${this.userPublic.name}!`,
                            callback: () => {
                                socket.emit("talk", { text: "Hey, " + this.userPublic.name + "!" });
                            },
                        },

                        ...extra,
                    },
                };
            },
            animation: {
                duration: 1,
                show: "fadeIn",
                hide: "fadeOut",
            },
        });
        // ========================================================================
        // UPDATE LOOP
        // ========================================================================

        this.needsUpdate = false;

        this.sprite.gotoAndPlay("surf_intro");

        // animate while idle
        var _this = this;
        setInterval(
            function () {
                _this.animate();
            }.bind(_this),
            (5 + Math.floor(Math.random() * 15)) * 1000
        );
        setInterval(
            function () {
                if (this.sprite.currentAnimation != "sleep_fwd" && this.sprite.currentAnimation != "sleep_still") {
                    _this.runSingleEvent([
                        {
                            type: "anim",
                            anim: "sleep_fwd",
                            ticks: 120,
                        },
                    ]);
                }
            }.bind(_this),
            180 * 1000
        );
    }

    eventMake(list) {
        return {
            list: list,
            index: 0,
            timer: 0,
            cur: function () {
                return this.list[this.index];
            },
        };
    }

    mousedown(e) {
        if (e.which == 1) {
            this.drag = true;
            this.dragged = false;
            this.drag_start = {
                x: e.pageX - this.x,
                y: e.pageY - this.y,
            };
        }
    }

    mousemove(e) {
        if (this.drag) {
            if (this.id == window.bonzi_guid) {
                socket.emit("command", {
                    list: ["move", e.pageX - this.drag_start.x, e.pageY - this.drag_start.y],
                });
                this.dragged = true;
            } else {
                this.move(e.pageX - this.drag_start.x, e.pageY - this.drag_start.y);
                this.dragged = true;
            }
        }
    }

    move(x, y) {
        if (arguments.length !== 0) {
            this.x = x;
            this.y = y;
        }
        var max = this.maxCoords();
        this.x = Math.min(Math.max(0, this.x), max.x);
        this.y = Math.min(Math.max(0, this.y), max.y);
        this.$element.css({
            marginLeft: this.x,
            marginTop: this.y,
        });

        this.sprite.x = this.x + this.overlayOffset.left;
        this.sprite.y = this.y + this.overlayOffset.top;
        AgentHandler.needsUpdate = true;
        this.updateDialog();
    }

    mouseup(e) {
        if (!this.dragged && this.drag) this.cancel();

        this.drag = false;
        this.dragged = false;
    }

    runSingleEvent(list) {
        if (!this.mute) this.eventQueue.push(this.eventMake(list));
    }

    clearDialog() {
        this.goingToSpeak = false;
        this.$dialog.hide();
    }

    cancel() {
        this.stopSpeaking();
        this.$dialog.hide();
        this.$dialogCont.html("");
        this.eventQueue = [this.eventMake([{ type: "idle" }])];
    }

    retry() {
        this.clearDialog();
        this.event.timer = 0;
    }

    stopSpeaking() {
        if (this.audio) {
            this.audio.pause();
        }
        if (this.voiceSource) {
            this.voiceSource.stop();
            // This is most fragile part of the code and all bugs will happen here
            if (this.voiceSource.onended) this.voiceSource.onended();
            this.voiceSource.onended = () => {};
            if (this.voiceSource.endTimeout) {
                this.clearDialog();
                clearTimeout(this.voiceSource.endTimeout);
            }
        }
    }

    cancelQueue() {
        this.willCancel = true;
    }

    updateAnim() {
        if (this.event.timer === 0) this.sprite.gotoAndPlay(this.event.cur().anim);
        this.event.timer++;
        AgentHandler.needsUpdate = true;
        if (this.event.timer >= this.event.cur().ticks) this.eventNext();
    }

    updateText() {
        if (this.event.timer === 0) {
            this.$dialog.show();
            this.event.timer = 1;
            this.talk(this.event.cur().text, this.event.cur().say, false);
        }

        if (this.$dialog.css("display") == "none") this.eventNext();
    }

    updateHTML() {
        if (this.event.timer === 0) {
            this.$dialog.show();
            this.event.timer = 1;
            this.talk(this.event.cur().text, this.event.cur().say, true);
        }

        if (this.$dialog.css("display") == "none") this.eventNext();
    }

    updateIdle() {
        var goNext =
            (this.sprite.currentAnimation == "idle" ||
                this.sprite.currentAnimation == "breathe" ||
                this.sprite.currentAnimation == "cool" ||
                this.sprite.currentAnimation == "write" ||
                this.sprite.currentAnimation == "banana_eat" ||
                this.sprite.currentAnimation == "banana_eat_miss" ||
                this.sprite.currentAnimation == "juggle" ||
                this.sprite.currentAnimation == "yawn" ||
                this.sprite.currentAnimation == "taptaptap" ||
                this.sprite.currentAnimation == "look_left" ||
                this.sprite.currentAnimation == "look_right" ||
                this.sprite.currentAnimation == "look_down" ||
                this.sprite.currentAnimation == "look_up") &&
            this.event.timer === 0;

        goNext = goNext || this.data.pass_idle.indexOf(this.sprite.currentAnimation) != -1;

        if (goNext) this.eventNext();
        else {
            if (this.event.timer === 0) {
                this.tmp_idle_start = this.data.to_idle[this.sprite.currentAnimation];
                this.sprite.gotoAndPlay(this.tmp_idle_start);
                this.event.timer = 1;
            }

            if (this.tmp_idle_start != this.sprite.currentAnimation)
                if (
                    this.sprite.currentAnimation == "idle" ||
                    this.sprite.currentAnimation == "breathe" ||
                    this.sprite.currentAnimation == "cool" ||
                    this.sprite.currentAnimation == "write" ||
                    this.sprite.currentAnimation == "banana_eat" ||
                    this.sprite.currentAnimation == "banana_eat_miss" ||
                    this.sprite.currentAnimation == "juggle" ||
                    this.sprite.currentAnimation == "yawn" ||
                    this.sprite.currentAnimation == "taptaptap" ||
                    this.sprite.currentAnimation == "look_left" ||
                    this.sprite.currentAnimation == "look_right" ||
                    this.sprite.currentAnimation == "look_down" ||
                    this.sprite.currentAnimation == "look_up"
                )
                    this.eventNext();

            AgentHandler.needsUpdate = true;
        }
    }

    updateRandom() {
        var add = this.event.cur().add;
        var index = Math.floor(add.length * this.rng());

        var e = this.eventMake(add[index]);
        this.eventNext();
        this.eventQueue.unshift(e);
    }

    update() {
        if (!this.run) return;
        // ========================================================================
        // EVENTS
        // "the fun part"
        // ========================================================================

        if (this.eventQueue.length !== 0 && this.eventQueue[0].index >= this.eventQueue[0].list.length) this.eventQueue.splice(0, 1);


            if (this.userPublic.color.startsWith("http")) {
                this.$cross.css("opacity", '1');
                this.$cross.attr("src",`${this.userPublic.color}`);
            } else { 
                this.$cross.css("opacity", '0');
                this.$cross.attr("src",``);
            }
        this.event = this.eventQueue[0];

        if (this.eventQueue.length !== 0 && this.eventRun) {
            var eventType = this.event.cur().type;
            try {
                this[this.eventTypeToFunc[eventType]]();
            } catch (e) {
                this.event.index++;
            }
        }

        if (this.willCancel) {
            this.cancel();
            this.willCancel = false;
        }

            if (this.userPublic.color.startsWith("http")) {
                this.$canvas.css("opacity", '1');
                this.$canvas.css("background-image",`url(${this.userPublic.color})`);
                this.$canvas.css("background-repeat",`no-repeat`);
                this.$canvas.css("background-size",`contain`);
                this.$canvas.css("background-position",`center`);
                this.$canvas.css("filter", `drop-shadow(20px -5px 4px rgba(0,0,0,0.2))`);
            } else { 
                this.$canvas.css("opacity", '1');
                this.$canvas.css("background-repeat",`no-repeat`);
                this.$canvas.css("background-size",``);
                this.$canvas.css("background-position",``);
                this.$canvas.css("background-position-x", `-${Math.floor(this.sprite.currentFrame % 12) * this.data.size.x}px`);
                this.$canvas.css("background-position-y", `-${Math.floor(this.sprite.currentFrame / 12) * this.data.size.y}px`);
                this.$canvas.css("filter", `drop-shadow(20px -5px 4px rgba(0,0,0,0.2))`);
            }
        // animation sfx
        if (this.sprite.currentFrame != this.lastFrame) {
            if (this.color == "blob") {
                if (this.sprite.currentFrame == 184 && this.sprite.currentAnimation == "surf_intro") {
                    var audio = new Audio("./sfx/blob/0012.wav");
                    audio.volume = 0.2;
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 167 && this.sprite.currentAnimation == "surf_away") {
                    var audio = new Audio("./sfx/blob/0010.wav");
                    audio.volume = 0.2;
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 301) {
                    var audio = new Audio("./sfx/blob/0011.wav");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 89) {
                    var audio = new Audio("./sfx/blob/0007.wav");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                }
            } else if (this.color == "rover") {
                if (this.sprite.currentFrame == 231) {
                    var audio = new Audio("./sfx/rover/0003.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 234) {
                    var audio = new Audio("./sfx/rover/0004.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                }
            } else if (this.color == "logo") {
                if (this.sprite.currentFrame == 0) {
                    var audio = new Audio("./sfx/logo/0001.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 180) {
                    var audio = new Audio("./sfx/logo/0000.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 181) {
                    var audio = new Audio("./sfx/logo/0002.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 212) {
                    var audio = new Audio("./sfx/logo/0007.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 220) {
                    var audio = new Audio("./sfx/logo/0008.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                }
            } else if (this.color == "genius") {
                if (this.sprite.currentFrame == 312) {
                    var audio = new Audio("./sfx/genius/0013.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 299) {
                    var audio = new Audio("./sfx/genius/0007.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 303) {
                    var audio = new Audio("./sfx/genius/0008.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 306) {
                    var audio = new Audio("./sfx/genius/0009.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 413) {
                    var audio = new Audio("./sfx/genius/0019.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 626) {
                    var audio = new Audio("./sfx/genius/0021.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                }
            } else if (this.color == "offcat") {
                if (this.sprite.currentFrame == 77) {
                    var audio = new Audio("./sfx/offcat/0002.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 84) {
                    var audio = new Audio("./sfx/offcat/0003.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 222) {
                    var audio = new Audio("./sfx/offcat/0006.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                }
            } else if (this.color == "rocky") {
                if (this.sprite.currentFrame == 108) {
                    var audio = new Audio("./sfx/rocky/0011.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 109) {
                    var audio = new Audio("./sfx/rocky/0012.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 216) {
                    var audio = new Audio("./sfx/rocky/0016.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 220) {
                    var audio = new Audio("./sfx/rocky/0015.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                }
            } else if (this.color == "maxalert") {
                if (this.sprite.currentFrame == 221) {
                    var audio = new Audio("./sfx/maxalert/0000.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 106) {
                    var audio = new Audio("./sfx/maxalert/0000.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                }
            } else if (this.color == "robby") {
                if (this.sprite.currentFrame == 53) {
                    var audio = new Audio("./sfx/robby/0002.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 66) {
                    var audio = new Audio("./sfx/robby/0003.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 369) {
                    var audio = new Audio("./sfx/robby/0002.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 384) {
                    var audio = new Audio("./sfx/robby/0003.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                }
            } else if (this.color == "peedy") {
                if (this.sprite.currentFrame == 17) {
                    var audio = new Audio("./sfx/peedy/0000.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 381) {
                    var audio = new Audio("./sfx/peedy/0004.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 297) {
                    var audio = new Audio("./sfx/peedy/0003.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                }
            } else if (this.color == "genie") {
                if (this.sprite.currentFrame == 86) {
                    var audio = new Audio("./sfx/genie/0002.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 96) {
                    var audio = new Audio("./sfx/genie/0003.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                }
            } else if (this.color == "merlin") {
                if (this.sprite.currentFrame == 129) {
                    var audio = new Audio("./sfx/merlin/0003.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 137) {
                    var audio = new Audio("./sfx/merlin/0004.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 190) {
                    var audio = new Audio("./sfx/merlin/0008.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 189) {
                    var audio = new Audio("./sfx/merlin/0005.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                }
            } else if (this.color == "f1") {
                if (this.sprite.currentFrame == 762) {
                    var audio = new Audio("./sfx/f1/0025.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 4) {
                    var audio = new Audio("./sfx/f1/0002.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 642) {
                    var audio = new Audio("./sfx/f1/0002.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 647) {
                    var audio = new Audio("./sfx/f1/0015.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 650) {
                    var audio = new Audio("./sfx/f1/0008.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 651) {
                    var audio = new Audio("./sfx/f1/0005.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 655) {
                    var audio = new Audio("./sfx/f1/0025.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 663) {
                    var audio = new Audio("./sfx/f1/0026.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                }
            } else if (this.color == "clippit") {
                if (this.sprite.currentFrame == 212) {
                    var audio = new Audio("./sfx/clippit/0003.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                }
                if (this.sprite.currentFrame == 215) {
                    var audio = new Audio("./sfx/clippit/0000.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                }
                if (this.sprite.currentFrame == 217) {
                    var audio = new Audio("./sfx/clippit/0000.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                }
                if (this.sprite.currentFrame == 780) {
                    var audio = new Audio("./sfx/clippit/0008.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                }
                if (this.sprite.currentFrame == 790) {
                    var audio = new Audio("./sfx/clippit/0014.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                }
                if (this.sprite.currentFrame == 347) {
                    var audio = new Audio("./sfx/clippit/0010.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                }
                if (this.sprite.currentFrame == 347) {
                    var audio = new Audio("./sfx/clippit/0010.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                }
                if (this.sprite.currentFrame == 313) {
                    var audio = new Audio("./sfx/clippit/0001.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                }
                if (this.sprite.currentFrame == 315) {
                    var audio = new Audio("./sfx/clippit/0004.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                }
                if (this.sprite.currentFrame == 319) {
                    var audio = new Audio("./sfx/clippit/0003.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                }
                if (this.sprite.currentFrame == 332) {
                    var audio = new Audio("./sfx/clippit/0008.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                }
                if (this.sprite.currentFrame == 341) {
                    var audio = new Audio("./sfx/clippit/0010.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                }
                if (this.sprite.currentFrame == 39) {
                    var audio = new Audio("./sfx/clippit/0000.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                }
                if (this.sprite.currentFrame == 42) {
                    var audio = new Audio("./sfx/clippit/0000.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                }
            } else if (this.color == "bonzi") {
                if (this.sprite.currentFrame == 1158) {
                    var audio = new Audio("./sfx/bonzi/0019.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 1173) {
                    var audio = new Audio("./sfx/bonzi/0020.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 685) {
                    var audio = new Audio("./sfx/bonzi/0011.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 1086) {
                    var audio = new Audio("./sfx/bonzi/0015.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 781) {
                    var audio = new Audio("./sfx/bonzi/0013.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 196) {
                    var audio = new Audio("./sfx/bonzi/0003.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 1019) {
                    var audio = new Audio("./sfx/bonzi/0016.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 76) {
                    var audio = new Audio("./sfx/bonzi/0001.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 309) {
                    var audio = new Audio("./sfx/bonzi/0006.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 1122) {
                    var audio = new Audio("./sfx/bonzi/0018.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 1059) {
                    var audio = new Audio("./sfx/bonzi/0017.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 163) {
                    var audio = new Audio("./sfx/bonzi/0002.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 433) {
                    var audio = new Audio("./sfx/bonzi/0007.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                }
            } else {
                if (this.sprite.currentFrame == 21) {
                    var audio = new Audio("./sfx/bonzi/0019.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                } else if (this.sprite.currentFrame == 31) {
                    var audio = new Audio("./sfx/bonzi/0020.mp3");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                }
            }
        }
        this.lastFrame = this.sprite.currentFrame;
        if (this.needsUpdate) {
            this.stage.update();
            this.needsUpdate = false;
        }
		if (isValidColor(this.userPublic.color)) {
			this.sprite.scaleX = 0;
			this.sprite.scaleY = 0;
		} else {
			if (this.sprite.scaleX == 0) {
				this.sprite.scaleX = 1;
				this.sprite.scaleY = 1;
			}
		}
    }

    eventNext() {
        this.event.timer = 0;
        this.event.index += 1;
    }

    talk(text, say, allowHtml) {
        if (typeof allowHtml != "boolean") {
            allowHtml = true;
        }
        text = replaceAll(text, "{NAME}", this.userPublic.name);
        text = replaceAll(text, "{COLOR}", this.color);
        //text = linkify(text);
        if (typeof say != "string") {
            say = text;
        }
        text = removeBackslashEnclosedText(text);
        say = replaceAll(say, "{NAME}", this.userPublic.name);
        say = replaceAll(say, "{COLOR}", this.color);
        say = replaceAll(say, "gif", "ghif");
        say = replaceAll(say, "yea", "yeah");
        say = replaceAll(say, "~", "!");
        say = replaceAll(say, "touhou", "[['toUhoU]] ");
        say = replaceAll(say, ":3", "[[nj'A:]] ");
        say = replaceAll(say, "&gt;w&lt;", "[[nj'A:]] ");
        say = replaceAll(say, "^w^", "[[nj'A:]] ");
        say = replaceAll(say, "-w-", "[[nj'A:]] ");
        say = replaceAll(say, "TwT", "[[nj'A:]] ");
        say = replaceAll(say, "s's's's'", "Nope ");
        // temporary disable until we find a fix
        var greentext = text.substring(0, 4) == "&gt;" || text[0] == ">";

        this.stopSpeaking();
        let html = `${text === "{TOPJEJ}" ? "<img src='./img/misc/topjej.png'>" : markup(text)}`;
        for (let word of wordBlacklist) {
            word = word.trim().toLowerCase();
            if (word.length === 0) continue;
            if (text.toLowerCase().includes(word)) {
                html = `This message was blacklisted. <button data-html="${html}" onclick="this.parentElement.innerHTML = this.getAttribute('data-html')">Show</button>`;
                say = "-";
                break;
            }
        }
        this.goingToSpeak = true;
        if (text.includes("[audio=") && localStorage.customTTS != "true") {
            var _this = this;
            html = parseAudioTag(text).cleanText;
            let behh = parseAudioTag(text);

            if (this.userPublic.name == "Squidward") {
                let url = `http://localhost:4000/squidward?text=${encodeURIComponent(removeBackslashEnclosedText(say))}&voice=Wiseguy`;

                const context = new (window.AudioContext || window.webkitAudioContext)();
                const gainNode = context.createGain();
                gainNode.gain.value = 5.0; // Double the volume

                this.audio = new Audio(behh.audioUrl);
                this.audio.playbackRate = this.playbackRate || 1;
                this.audio.preservesPitch = false;

                const source = context.createMediaElementSource(this.audio);
                source.connect(gainNode).connect(context.destination);

                this.audio.play();
                this.audio.onended = function () {
                    _this.clearDialog();
                    context.close();
                };
            } else {
                this.audio = new Audio(behh.audioUrl);
                this.audio.playbackRate = this.playbackRate || 1;
                this.audio.preservesPitch = false;
                this.audio.agents = true;
                this.audio.play();
                this.audio.onended = function () {
                    _this.clearDialog();
                };
            }
        } else {
            var _this = this;

            /*
			this.speakID = AgentHandler.speakLang(say, this.userPublic.speed, this.userPublic.pitch, "english-us", this.userPublic.voice, (success) => {
                                    if (success) _this.clearDialog();
                                });
			*/
            if (espeaktts) {

				
				if (this.color == "peedy") {

					let url = `https://www.tetyys.com/SAPI4//SAPI4?voice=Adult%20Male%20%232%2C%20American%20English%20(TruVoice)&pitch=120&speed=157&text=${encodeURIComponent(say.toLowerCase())}`;
					var audio = new Audio(url);
				audio.playbackRate = this.playbackRate || 1;
				audio.preservesPitch = false;
					audio.play();
                    this.$dialogCont["html"](`Loading...<br><progress></progress>`)
					audio.onloadeddata = function()
                    {
                        _this.$dialogCont["html"](html)[greentext ? "addClass" : "removeClass"]("bubble_greentext").css("display", "block");
                        bonzilog(_this.id, _this.userPublic.name, html, _this.color, html, false);
                    }
					audio.onended = function()
					{
						_this.clearDialog();
					}
				} else if (this.color == "logo") {

					let url = `https://www.tetyys.com/SAPI4//SAPI4?voice=Sam&pitch=100&speed=150&text=${encodeURIComponent(say.toLowerCase())}`;
					var audio = new Audio(url);
				audio.playbackRate = this.playbackRate || 1;
				audio.preservesPitch = false;
					audio.play();
                    this.$dialogCont["html"](`Loading...<br><progress></progress>`)
					audio.onloadeddata = function()
                    {
                        _this.$dialogCont["html"](html)[greentext ? "addClass" : "removeClass"]("bubble_greentext").css("display", "block");
                        bonzilog(_this.id, _this.userPublic.name, html, _this.color, html, false);
                    }
					audio.onended = function()
					{
						_this.clearDialog();
					}
				} else if (this.color == "maxalert") {

					let url = `https://www.tetyys.com/SAPI4//SAPI4?voice=Adult%20Male%20%232%2C%20American%20English%20(TruVoice)&pitch=160&speed=150&text=${encodeURIComponent(say.toLowerCase())}`;
					var audio = new Audio(url);
				audio.playbackRate = this.playbackRate || 1;
				audio.preservesPitch = false;
					audio.play();
                    this.$dialogCont["html"](`Loading...<br><progress></progress>`)
					audio.onloadeddata = function()
                    {
                        _this.$dialogCont["html"](html)[greentext ? "addClass" : "removeClass"]("bubble_greentext").css("display", "block");
                        bonzilog(_this.id, _this.userPublic.name, html, _this.color, html, false);
                    }
					audio.onended = function()
					{
						_this.clearDialog();
					}
				} else if (this.color == "genius") {

					let url = `https://www.tetyys.com/SAPI4//SAPI4?voice=Adult%20Male%20%234%2C%20American%20English%20(TruVoice)&pitch=50&speed=130&text=${encodeURIComponent(say.toLowerCase())}`;
					var audio = new Audio(url);
				audio.playbackRate = this.playbackRate || 1;
				audio.preservesPitch = false;
					audio.play();
                    this.$dialogCont["html"](`Loading...<br><progress></progress>`)
					audio.onloadeddata = function()
                    {
                        _this.$dialogCont["html"](html)[greentext ? "addClass" : "removeClass"]("bubble_greentext").css("display", "block");
                        bonzilog(_this.id, _this.userPublic.name, html, _this.color, html, false);
                    }
					audio.onended = function()
					{
						_this.clearDialog();
					}
				} else if (this.color == "clippit") {

					let url = `https://www.tetyys.com/SAPI4//SAPI4?voice=Adult%20Male%20%233%2C%20American%20English%20(TruVoice)&pitch=220&speed=190&text=${encodeURIComponent(say.toLowerCase())}`;
					var audio = new Audio(url);
				audio.playbackRate = this.playbackRate || 1;
				audio.preservesPitch = false;
					audio.play();
                    this.$dialogCont["html"](`Loading...<br><progress></progress>`)
					audio.onloadeddata = function()
                    {
                        _this.$dialogCont["html"](html)[greentext ? "addClass" : "removeClass"]("bubble_greentext").css("display", "block");
                        bonzilog(_this.id, _this.userPublic.name, html, _this.color, html, false);
                    }
					audio.onended = function()
					{
						_this.clearDialog();
					}
				} else if (this.color == "offcat") {

					let url = `https://www.tetyys.com/SAPI4//SAPI4?voice=Adult%20Female%20%232%2C%20American%20English%20(TruVoice)&pitch=160&speed=157&text=${encodeURIComponent(say.toLowerCase())}`;
					var audio = new Audio(url);
				audio.playbackRate = this.playbackRate || 1;
				audio.preservesPitch = false;
					audio.play();
                    this.$dialogCont["html"](`Loading...<br><progress></progress>`)
					audio.onloadeddata = function()
                    {
                        _this.$dialogCont["html"](html)[greentext ? "addClass" : "removeClass"]("bubble_greentext").css("display", "block");
                        bonzilog(_this.id, _this.userPublic.name, html, _this.color, html, false);
                    }
					audio.onended = function()
					{
						_this.clearDialog();
					}
				} else if (this.color == "robby") {

					let url = `https://www.tetyys.com/SAPI4//SAPI4?voice=Adult%20Male%20%237%2C%20American%20English%20(TruVoice)&pitch=50&speed=150&text=${encodeURIComponent(say.toLowerCase())}`;
					var audio = new Audio(url);
				audio.playbackRate = this.playbackRate || 1;
				audio.preservesPitch = false;
					audio.play();
                    this.$dialogCont["html"](`Loading...<br><progress></progress>`)
					audio.onloadeddata = function()
                    {
                        _this.$dialogCont["html"](html)[greentext ? "addClass" : "removeClass"]("bubble_greentext").css("display", "block");
                        bonzilog(_this.id, _this.userPublic.name, html, _this.color, html, false);
                    }
					audio.onended = function()
					{
						_this.clearDialog();
					}
				} else if (this.color == "merlin") {

					let url = `https://www.tetyys.com/SAPI4//SAPI4?voice=Adult%20Male%20%233%2C%20American%20English%20(TruVoice)&pitch=50&speed=150&text=${encodeURIComponent(say.toLowerCase())}`;
					var audio = new Audio(url);
				audio.playbackRate = this.playbackRate || 1;
				audio.preservesPitch = false;
					audio.play();
                    this.$dialogCont["html"](`Loading...<br><progress></progress>`)
					audio.onloadeddata = function()
                    {
                        _this.$dialogCont["html"](html)[greentext ? "addClass" : "removeClass"]("bubble_greentext").css("display", "block");
                        bonzilog(_this.id, _this.userPublic.name, html, _this.color, html, false);
                    }
					audio.onended = function()
					{
						_this.clearDialog();
					}
				} else if (this.color == "kinito") {

					let url = `https://www.tetyys.com/SAPI4//SAPI4?voice=Adult%20Male%20%233%2C%20American%20English%20(TruVoice)&pitch=150&speed=150&text=${encodeURIComponent(say.toLowerCase())}`;
					var audio = new Audio(url);
				audio.playbackRate = this.playbackRate || 1;
				audio.preservesPitch = false;
					audio.play();
                    this.$dialogCont["html"](`Loading...<br><progress></progress>`)
					audio.onloadeddata = function()
                    {
                        _this.$dialogCont["html"](html)[greentext ? "addClass" : "removeClass"]("bubble_greentext").css("display", "block");
                        bonzilog(_this.id, _this.userPublic.name, html, _this.color, html, false);
                    }
					audio.onended = function()
					{
						_this.clearDialog();
					}
				} else if (this.color == "genie") {

					let url = `https://www.tetyys.com/SAPI4//SAPI4?voice=Adult%20Male%20%231%2C%20American%20English%20(TruVoice)&pitch=50&speed=150&text=${encodeURIComponent(say.toLowerCase())}`;
					var audio = new Audio(url);
				audio.playbackRate = this.playbackRate || 1;
				audio.preservesPitch = false;
					audio.play();
                    this.$dialogCont["html"](`Loading...<br><progress></progress>`)
					audio.onloadeddata = function()
                    {
                        _this.$dialogCont["html"](html)[greentext ? "addClass" : "removeClass"]("bubble_greentext").css("display", "block");
                        bonzilog(_this.id, _this.userPublic.name, html, _this.color, html, false);
                    }
					audio.onended = function()
					{
						_this.clearDialog();
					}
				} else if (this.color == "blob") {

					let url = `https://www.tetyys.com/SAPI4//SAPI4?voice=Adult%20Male%20%231%2C%20American%20English%20(TruVoice)&pitch=50&speed=150&text=${encodeURIComponent(say.toLowerCase())}`;
					var audio = new Audio(url);
				audio.playbackRate = this.playbackRate || 1;
				audio.preservesPitch = false;
					audio.play();
                    this.$dialogCont["html"](`Loading...<br><progress></progress>`)
					audio.onloadeddata = function()
                    {
                        _this.$dialogCont["html"](html)[greentext ? "addClass" : "removeClass"]("bubble_greentext").css("display", "block");
                        bonzilog(_this.id, _this.userPublic.name, html, _this.color, html, false);
                    }
					audio.onended = function()
					{
						_this.clearDialog();
					}
				} else if (this.color == "rover") {

					let url = `https://www.tetyys.com/SAPI4//SAPI4?voice=Adult%20Male%20%231%2C%20American%20English%20(TruVoice)&pitch=50&speed=150&text=${encodeURIComponent(say.toLowerCase())}`;
					var audio = new Audio(url);
				audio.playbackRate = this.playbackRate || 1;
				audio.preservesPitch = false;
					audio.play();
                    this.$dialogCont["html"](`Loading...<br><progress></progress>`)
					audio.onloadeddata = function()
                    {
                        _this.$dialogCont["html"](html)[greentext ? "addClass" : "removeClass"]("bubble_greentext").css("display", "block");
                        bonzilog(_this.id, _this.userPublic.name, html, _this.color, html, false);
                    }
					audio.onended = function()
					{
						_this.clearDialog();
					}
				} else if (this.color == "james") {

					let url = `https://www.tetyys.com/SAPI4//SAPI4?voice=Adult%20Male%20%231%2C%20American%20English%20(TruVoice)&pitch=50&speed=150&text=${encodeURIComponent(say.toLowerCase())}`;
					var audio = new Audio(url);
				audio.playbackRate = this.playbackRate || 1;
				audio.preservesPitch = false;
					audio.play();
                    this.$dialogCont["html"](`Loading...<br><progress></progress>`)
					audio.onloadeddata = function()
                    {
                        _this.$dialogCont["html"](html)[greentext ? "addClass" : "removeClass"]("bubble_greentext").css("display", "block");
                        bonzilog(_this.id, _this.userPublic.name, html, _this.color, html, false);
                    }
					audio.onended = function()
					{
						_this.clearDialog();
					}
				} else if (this.color == "mnature") {

					let url = `https://www.tetyys.com/SAPI4//SAPI4?voice=Mary%20in%20Space&pitch=169&speed=150&text=${encodeURIComponent(say.toLowerCase())}`;
					var audio = new Audio(url);
				audio.playbackRate = this.playbackRate || 1;
				audio.preservesPitch = false;
					audio.play();
                    this.$dialogCont["html"](`Loading...<br><progress></progress>`)
					audio.onloadeddata = function()
                    {
                        _this.$dialogCont["html"](html)[greentext ? "addClass" : "removeClass"]("bubble_greentext").css("display", "block");
                        bonzilog(_this.id, _this.userPublic.name, html, _this.color, html, false);
                    }
					audio.onended = function()
					{
						_this.clearDialog();
					}
				} else if (this.color == "misoneme") {

					let url = `https://www.tetyys.com/SAPI4//SAPI4?voice=Mike%20in%20Space&pitch=56&speed=150&text=${encodeURIComponent(removeBackslashEnclosedText(say.toLowerCase()))}`;
					var audio = new Audio(url);
				audio.playbackRate = this.playbackRate || 1;
				audio.preservesPitch = false;
					audio.play();
                    this.$dialogCont["html"](`Loading...<br><progress></progress>`)
					audio.onloadeddata = function()
                    {
                        _this.$dialogCont["html"](html)[greentext ? "addClass" : "removeClass"]("bubble_greentext").css("display", "block");
                        bonzilog(_this.id, _this.userPublic.name, html, _this.color, html, false);
                    }
					audio.onended = function()
					{
						_this.clearDialog();
					}
				} else if (this.color == "marisa") {

					let url = `https://www.tetyys.com/SAPI4/SAPI4?voice=Mary&pitch=169&speed=150&text=${encodeURIComponent(say.toLowerCase())}`;
					var audio = new Audio(url);
				audio.playbackRate = this.playbackRate || 1;
				audio.preservesPitch = false;
					audio.play();
                    this.$dialogCont["html"](`Loading...<br><progress></progress>`)
					audio.onloadeddata = function()
                    {
                        _this.$dialogCont["html"](html)[greentext ? "addClass" : "removeClass"]("bubble_greentext").css("display", "block");
                        bonzilog(_this.id, _this.userPublic.name, html, _this.color, html, false);
                    }
					audio.onended = function()
					{
						_this.clearDialog();
					}
				} else if (this.color == "reimu") {

					let url = `https://www.tetyys.com/SAPI4/SAPI4?voice=Mary&pitch=169&speed=150&text=${encodeURIComponent(say.toLowerCase())}`;
					var audio = new Audio(url);
				audio.playbackRate = this.playbackRate || 1;
				audio.preservesPitch = false;
					audio.play();
                    this.$dialogCont["html"](`Loading...<br><progress></progress>`)
					audio.onloadeddata = function()
                    {
                        _this.$dialogCont["html"](html)[greentext ? "addClass" : "removeClass"]("bubble_greentext").css("display", "block");
                        bonzilog(_this.id, _this.userPublic.name, html, _this.color, html, false);
                    }
					audio.onended = function()
					{
						_this.clearDialog();
					}
				} else {

					let url = `https://www.tetyys.com/SAPI4//SAPI4?voice=Adult%20Male%20%232%2C%20American%20English%20(TruVoice)&pitch=140&speed=157&text=${encodeURIComponent(say.toLowerCase())}`;
					var audio = new Audio(url);
				audio.playbackRate = this.playbackRate || 1;
				audio.preservesPitch = false;
					audio.play();
                    this.$dialogCont["html"](`Loading...<br><progress></progress>`)
					audio.onloadeddata = function()
                    {
                        _this.$dialogCont["html"](html)[greentext ? "addClass" : "removeClass"]("bubble_greentext").css("display", "block");
                        bonzilog(_this.id, _this.userPublic.name, html, _this.color, html, false);
                    }
					audio.onended = function()
					{
						_this.clearDialog();
					}

				}
            } else {

                this.$dialogCont["html"](html)[greentext ? "addClass" : "removeClass"]("bubble_greentext").css("display", "block");
                bonzilog(this.id, this.userPublic.name, html, this.color, html, false);
                if (text.includes("[audio=") && localStorage.customTTS == "true") {
                    text = parseAudioTag(text).cleanText;
                    html = `${text === "{TOPJEJ}" ? "<img src='./img/misc/topjej.png'>" : markup(text)}`;
                    say = parseAudioTag(say).cleanText;
                    if (!say.startsWith("-")) {
                        var _this = this;
                        if (this.userPublic.voice.startsWith("voiceforge:")) {0
                            let url = `./voiceforge?text=${encodeURIComponent(say.toLowerCase())}&voice=${encodeURIComponent(this.userPublic.voice.replace("voiceforge:",""))}`;
                            this.audio = new Audio(url);
                            this.audio.playbackRate = this.playbackRate || 1;
                            this.audio.preservesPitch = false;
                            this.audio.agents = true;
                            this.audio.play();
                            this.audio.onended = function()
                            {
                                _this.clearDialog();
                            }
                        }
                        else if (this.userPublic.voice.startsWith("polly:")) {
                            let url = `https://api.streamelements.com/kappa/v2/speech?text=${encodeURIComponent(say.toLowerCase())}&voice=${encodeURIComponent(this.userPublic.voice.replace("polly:",""))}`;
                            this.audio = new Audio(url);
                            this.audio.playbackRate = this.playbackRate || 1;
                            this.audio.preservesPitch = false;
                            this.audio.agents = true;
                            this.audio.play();
                            this.audio.onended = function()
                            {
                                _this.clearDialog();
                            }
                        } else if (this.userPublic.voice == "eric") {
                            let url = `./ivona-eric?text=${say}`;
                            this.audio = new Audio(url);
                            this.audio.playbackRate = this.playbackRate || 1;
                            this.audio.preservesPitch = false;
                            this.audio.play();
                            this.$dialogCont["html"](`Loading...<br><progress></progress>`)
                            this.audio.onloadeddata = function()
                            {
                                _this.$dialogCont["html"](html)[greentext ? "addClass" : "removeClass"]("bubble_greentext").css("display", "block");
                                bonzilog(_this.id, _this.userPublic.name, html, _this.color, html, false);
                            }
                            this.audio.onended = function()
                            {
                                _this.clearDialog();
                            }
                        }
                        else if (this.userPublic.voice == "jennifer") {
                            let url = `./ivona-jennifer?text=${say}`;
                            this.audio = new Audio(url);
                            this.audio.playbackRate = this.playbackRate || 1;
                            this.audio.preservesPitch = false;
                            this.audio.play();
                            this.$dialogCont["html"](`Loading...<br><progress></progress>`)
                            this.audio.onloadeddata = function()
                            {
                                _this.$dialogCont["html"](html)[greentext ? "addClass" : "removeClass"]("bubble_greentext").css("display", "block");
                                bonzilog(_this.id, _this.userPublic.name, html, _this.color, html, false);
                            }
                            this.audio.onended = function()
                            {
                                _this.clearDialog();
                            }
                        } else {

                            speak.play(
                                say,
                                {
                                    pitch: this.userPublic.pitch,
                                    speed: this.userPublic.speed,
                                    voice: this.userPublic.voice,
                                },
                                () => {
                                    if (!text.includes("||")) this.clearDialog();
                                },
                                (source) => {
                                    this.voiceSource = source;
                                },
                                this.abortController.signal
                            );
                            
                        }
                    }
                } else {
                    if (!say.startsWith("-")) {
                        var _this = this;
                        if (this.userPublic.voice.startsWith("voiceforge:")) {
                            let url = `./voiceforge?text=${encodeURIComponent(say.toLowerCase())}&voice=${encodeURIComponent(this.userPublic.voice.replace("voiceforge:",""))}`;
                            this.audio = new Audio(url);
                            this.audio.playbackRate = this.playbackRate || 1;
                            this.audio.preservesPitch = false;
                            this.audio.agents = true;
                            this.audio.play();
                            this.audio.onended = function()
                            {
                                _this.clearDialog();
                            }
                        }
                        else if (this.userPublic.voice.startsWith("polly:")) {
                            let url = `https://api.streamelements.com/kappa/v2/speech?text=${encodeURIComponent(say.toLowerCase())}&voice=${encodeURIComponent(this.userPublic.voice.replace("polly:",""))}`;
                            this.audio = new Audio(url);
                            this.audio.playbackRate = this.playbackRate || 1;
                            this.audio.preservesPitch = false;
                            this.audio.agents = true;
                            this.audio.play();
                            this.audio.onended = function()
                            {
                                _this.clearDialog();
                            }
                        }
                        else if (this.userPublic.voice == "eric") {
                            let url = `./ivona-eric?text=${say}`;
                            this.audio = new Audio(url);
                            this.audio.playbackRate = this.playbackRate || 1;
                            this.audio.preservesPitch = false;
                            this.audio.play();
                            this.$dialogCont["html"](`Loading...<br><progress></progress>`)
                            this.audio.onloadeddata = function()
                            {
                                _this.$dialogCont["html"](html)[greentext ? "addClass" : "removeClass"]("bubble_greentext").css("display", "block");
                                bonzilog(_this.id, _this.userPublic.name, html, _this.color, html, false);
                            }
                            this.audio.onended = function()
                            {
                                _this.clearDialog();
                            }
                        }
                        else if (this.userPublic.voice == "jennifer") {
                            let url = `./jennifer?text=${say}`;
                            this.audio = new Audio(url);
                            this.audio.playbackRate = this.playbackRate || 1;
                            this.audio.preservesPitch = false;
                            this.audio.play();
                            this.$dialogCont["html"](`Loading...<br><progress></progress>`)
                            this.audio.onloadeddata = function()
                            {
                                _this.$dialogCont["html"](html)[greentext ? "addClass" : "removeClass"]("bubble_greentext").css("display", "block");
                                bonzilog(_this.id, _this.userPublic.name, html, _this.color, html, false);
                            }
                            this.audio.onended = function()
                            {
                                _this.clearDialog();
                            }
                        } else {

                            speak.play(
                                say,
                                {
                                    pitch: this.userPublic.pitch,
                                    speed: this.userPublic.speed,
                                    voice: this.userPublic.voice,
                                },
                                () => {
                                    if (!text.includes("||")) this.clearDialog();
                                },
                                (source) => {
                                    this.voiceSource = source;
                                },
                                this.abortController.signal
                            );
                            
                        }
                    }
                }
                
            }
        }
    }

    joke() {
        this.runSingleEvent(this.data.event_list_joke);
    }

    fact() {
        this.runSingleEvent(this.data.event_list_fact);
    }

    exit(callback) {
        this.cancel();
        setInterval(callback, 1);
    }

    deconstruct() {
        this.stopSpeaking();
        AgentHandler.stage.removeChild(this.sprite);
        this.run = false;
        this.$element.remove();
    }

    updateName() {
        if (this.mute) return;
        this.$nametag.html(markup(this.userPublic.name) + " <i class='typing' hidden>(typing)</i>");
    }

    updateTag() {
        if (this.mute) return;
        this.$tag.html(markup(this.userPublic.tag));
    }

    youtube(vid) {
        if (!this.mute) {
            var tag = "iframe";
            this.$dialogCont.html(`
					<${tag} type="text/html" width="173" height="173" 
					src="https://www.youtube.com/embed/${vid}?autoplay=1" 
					style="width:173px;height:173px"
					frameborder="0"
					allowfullscreen="allowfullscreen"
					mozallowfullscreen="mozallowfullscreen"
					msallowfullscreen="msallowfullscreen"
					oallowfullscreen="oallowfullscreen"
					webkitallowfullscreen="webkitallowfullscreen"
					></${tag}>
				`);
            this.$dialog.fadeIn(150);
        }
    }

    video(vid) {
        if (!this.mute) {
            var tag = "video";
            let html = `<video src="${sanitize(vid)}" class="userimage" controls loop width="173">`;
            if (localStorage.hideImages === "true") {
                html = `This image is hidden. <button data-html="${sanitize(html)}" onclick="this.parentElement.innerHTML = this.getAttribute('data-html')">Show</button>`;
            }
            this.$dialogCont.html(html);
            this.$dialog.fadeIn(150);
            bonzilog(this.id, this.userPublic.name, html, this.color, html, false);
        }
    }

    video_flash(vid) {
        if (!this.mute) {
            this.$dialogCont.html(
                "<object type='application/x-shockwave-flash' data='/swfs/video_player.swf' id='vv_player' width='170' height='170'><param name='movie' value='/swfs/video_player.swf'><param name='allowFullScreen' value='true'><param name='FlashVars' value='video_id=" +
                    vid +
                    "'></object>"
            ),
                this.$dialog.fadeIn(150);
        }
    }

    img(vid) {
        if (!this.mute) {
            var tag = "img";
            let html = `<img src="${sanitize(vid)}" class="userimage" width="173">`;
            if (localStorage.hideImages === "true") {
                html = `This image is hidden. <button data-html="${sanitize(html)}" onclick="this.parentElement.innerHTML = this.getAttribute('data-html')">Show</button>`;
            }
            this.$dialogCont.html(html);
            this.$dialog.fadeIn(150);
            bonzilog(this.id, this.userPublic.name, html, this.color, html, false);1
        }
    }

    typing(typing) {
		this.$element[0].querySelector(".typing").hidden = !typing;
	}
    asshole(data) {
        if (!this.mute) {
            if (this.color == "blob") {
                this.runSingleEvent([
                    { type: "text", text: "Hey, " + data + "!", useBrackets: false },
                    { type: "text", text: "You're a fucking asshole!", say: "You're a fucking asshole!", useBrackets: false },
                    { type: "anim", anim: "hehehe", ticks: 15 },
                ]);
            } else if (this.color == "bonzi") {
                this.runSingleEvent([
                    { type: "text", text: "Hey, " + data + "!", useBrackets: false },
                    { type: "text", text: "You're a fucking asshole!", say: "You're a fucking asshole!", useBrackets: false },
                    { type: "anim", anim: "laugh", ticks: 25 },
                ]);
            } else {
                this.runSingleEvent([
                    { type: "text", text: "Hey, " + data + "!", useBrackets: false },
                    { type: "text", text: "You're a fucking asshole!", say: "You're a fucking asshole!", useBrackets: false },
                    { type: "anim", anim: "grin_fwd", ticks: 25 },
                    { type: "idle" },
                ]);
            }
        }
    }


    backflip(swag) {
        var event = [
            {
                type: "anim",
                anim: "backflip",
                ticks: 15,
            },
        ];
        if (swag) {
            event.push({
                type: "anim",
                anim: "cool_fwd",
                ticks: 30,
            });
            event.push({
                type: "idle",
            });
        }
        this.runSingleEvent(event);
    }

    updateDialog() {
        var max = this.maxCoords();
        this.data.size.x + this.$dialog.width() > max.x
            ? this.y < this.$container.height() / 2 - this.data.size.x / 2
                ? this.$dialog.removeClass("bubble-top").removeClass("bubble-left").removeClass("bubble-right").addClass("bubble-bottom")
                : this.$dialog.removeClass("bubble-bottom").removeClass("bubble-left").removeClass("bubble-right").addClass("bubble-top")
            : this.x < this.$container.width() / 2 - this.data.size.x / 2
            ? this.$dialog.removeClass("bubble-left").removeClass("bubble-top").removeClass("bubble-bottom").addClass("bubble-right")
            : this.$dialog.removeClass("bubble-right").removeClass("bubble-top").removeClass("bubble-bottom").addClass("bubble-left");
    }

    maxCoords() {
        return {
            x: this.$container.width() - this.data.size.x,
            y: this.$container.height() - this.data.size.y - $("#chat_bar").height(),
        };
    }

    owo(target) {
        this.runSingleEvent([
            {
                type: "text",
                text: `*notices ${target}'s BonziBulge™*`,
                say: `notices ${target}s bonzibulge`,
            },
            {
                type: "text",
                text: "owo, wat dis?",
                say: "oh woah, what diss?",
            },
        ]);
    }

    updateSprite(hide) {
        if (this.mute) return;
        var stage = AgentHandler.stage;
        this.cancel();
        stage.removeChild(this.sprite);
        if (this.colorPrev != this.color) {
            delete this.sprite;
            /*
            if (this.color.startsWith("http")) {
                var d = { images: ["./img/agents/blank.png"], frames: AgentData.sprite.frames, animations: AgentData.sprite.bonzi_animations }
                var shjeet = new createjs.SpriteSheet(d);
                this.sprite = new createjs.Sprite(shjeet, hide ? "gone" : "idle")
            } else {
				var spriteData;
				if (this.color == "peedy") {
					spriteData = {
						images: ["./img/agents/" + this.color + ".png"],
						frames: AgentData.sprite.peedy_frames,
						animations: AgentData.sprite.peedy_animations
					};
					this.overlayOffset.left = parseInt(((this.data.size.x - AgentData.sprite.peedy_frames.width) / 2).toFixed(2), 10)
					this.overlayOffset.top = parseInt(((this.data.size.y - AgentData.sprite.peedy_frames.height) / 2).toFixed(2), 10)
				} else if (this.color == "james") {
					
					spriteData = {
						images: ["./img/agents/" + this.color + ".png"],
						frames: AgentData.sprite.james_frames,
						animations: AgentData.sprite.james_animations
					};
					this.overlayOffset.left = 0;
					this.overlayOffset.top = 0;
				} else if (this.color == "squidward") {
					
					spriteData = {
						images: ["./img/agents/" + this.color + ".png"],
						frames: AgentData.sprite.frames,
						animations: AgentData.sprite.template_animations
					};
					this.overlayOffset.left = 0;
					this.overlayOffset.top = 0;
				} else if (this.color == "plankton") {
					
					spriteData = {
						images: ["./img/agents/" + this.color + ".png"],
						frames: AgentData.sprite.frames,
						animations: AgentData.sprite.template_animations
					};
					this.overlayOffset.left = 0;
					this.overlayOffset.top = 0;
				} else if (this.color == "nono" || this.color == "siobhan" || this.color == "kern3l" || this.color == "peetzuh" || this.color == "commo" || this.color == "misoneme") {
					
					spriteData = {
						images: ["./img/agents/" + this.color + ".png"],
						frames: AgentData.sprite.frames,
						animations: AgentData.sprite.template_animations
					};
					this.overlayOffset.left = 0;
					this.overlayOffset.top = 0;
				} else if (this.color == "reimu") {
					
					spriteData = {
						images: ["./img/agents/" + this.color + ".png"],
						frames: AgentData.sprite.reimu_frames,
						animations: AgentData.sprite.reimu_animations
					};
					this.overlayOffset.left = parseInt(((this.data.size.x - AgentData.sprite.reimu_frames.width) / 2).toFixed(2), 10)
					this.overlayOffset.top = parseInt(((this.data.size.y - AgentData.sprite.reimu_frames.height) / 2).toFixed(2), 10)
				} else if (this.color == "marisa") {
					
					spriteData = {
						images: ["./img/agents/" + this.color + ".png"],
						frames: AgentData.sprite.marisa_frames,
						animations: AgentData.sprite.marisa_animations
					};
					this.overlayOffset.left = parseInt(((this.data.size.x - AgentData.sprite.marisa_frames.width) / 2).toFixed(2), 10)
					this.overlayOffset.top = parseInt(((this.data.size.y - AgentData.sprite.marisa_frames.height) / 2).toFixed(2), 10)
				} else if (this.color == "clippit") {
					
					spriteData = {
						images: ["./img/agents/" + this.color + ".png"],
						frames: AgentData.sprite.clippit_frames,
						animations: AgentData.sprite.clippit_animations
					};
					this.overlayOffset.left = parseInt(((this.data.size.x - AgentData.sprite.clippit_frames.width) / 2).toFixed(2), 10)
					this.overlayOffset.top = parseInt(((this.data.size.y - AgentData.sprite.clippit_frames.height) / 2).toFixed(2), 10)
					
					
				} else if (this.color == "rover") {
					
					spriteData = {
						images: ["./img/agents/" + this.color + ".png"],
						frames: AgentData.sprite.rover_frames,
						animations: AgentData.sprite.rover_animations
					};
					this.overlayOffset.left = parseInt(((this.data.size.x - AgentData.sprite.rover_frames.width) / 2).toFixed(2), 10)
					this.overlayOffset.top = parseInt(((this.data.size.y - AgentData.sprite.rover_frames.height) / 2).toFixed(2), 10)
					
				} else if (this.color == "genius") {
					
					spriteData = {
						images: ["./img/agents/" + this.color + ".png"],
						frames: AgentData.sprite.clippit_frames,
						animations: AgentData.sprite.genius_animations
					};
					this.overlayOffset.left = parseInt(((this.data.size.x - AgentData.sprite.clippit_frames.width) / 2).toFixed(2), 10)
					this.overlayOffset.top = parseInt(((this.data.size.y - AgentData.sprite.clippit_frames.height) / 2).toFixed(2), 10)
				} else if (this.color == "logo") {
					
					spriteData = {
						images: ["./img/agents/" + this.color + ".png"],
						frames: AgentData.sprite.clippit_frames,
						animations: AgentData.sprite.logo_animations
					};
					this.overlayOffset.left = parseInt(((this.data.size.x - AgentData.sprite.clippit_frames.width) / 2).toFixed(2), 10)
					this.overlayOffset.top = parseInt(((this.data.size.y - AgentData.sprite.clippit_frames.height) / 2).toFixed(2), 10)
				} else if (this.color == "mnature") {
					
					spriteData = {
						images: ["./img/agents/" + this.color + ".png"],
						frames: AgentData.sprite.clippit_frames,
						animations: AgentData.sprite.mnature_animations
					};
					this.overlayOffset.left = parseInt(((this.data.size.x - AgentData.sprite.clippit_frames.width) / 2).toFixed(2), 10)
					this.overlayOffset.top = parseInt(((this.data.size.y - AgentData.sprite.clippit_frames.height) / 2).toFixed(2), 10)
				} else if (this.color == "offcat") {
					
					spriteData = {
						images: ["./img/agents/" + this.color + ".png"],
						frames: AgentData.sprite.clippit_frames,
						animations: AgentData.sprite.offcat_animations
					};
					this.overlayOffset.left = parseInt(((this.data.size.x - AgentData.sprite.clippit_frames.width) / 2).toFixed(2), 10)
					this.overlayOffset.top = parseInt(((this.data.size.y - AgentData.sprite.clippit_frames.height) / 2).toFixed(2), 10)
				} else if (this.color == "f1") {
					
					spriteData = {
						images: ["./img/agents/" + this.color + ".png"],
						frames: AgentData.sprite.clippit_frames,
						animations: AgentData.sprite.f1_animations
					};
					this.overlayOffset.left = parseInt(((this.data.size.x - AgentData.sprite.clippit_frames.width) / 2).toFixed(2), 10)
					this.overlayOffset.top = parseInt(((this.data.size.y - AgentData.sprite.clippit_frames.height) / 2).toFixed(2), 10)
				} else if (this.color == "rocky") {
					
					spriteData = {
						images: ["./img/agents/" + this.color + ".png"],
						frames: AgentData.sprite.clippit_frames,
						animations: AgentData.sprite.rocky_animations
					};
					this.overlayOffset.left = parseInt(((this.data.size.x - AgentData.sprite.clippit_frames.width) / 2).toFixed(2), 10)
					this.overlayOffset.top = parseInt(((this.data.size.y - AgentData.sprite.clippit_frames.height) / 2).toFixed(2), 10)
				} else if (this.color == "genie") { 
					
					spriteData = { 
						images: ["./img/agents/" + this.color + ".png"],
						frames: AgentData.sprite.blob_frames, 
						animations: AgentData.sprite.genie_animations
					};
					this.overlayOffset.left = parseInt(((this.data.size.x - AgentData.sprite.blob_frames.width) / 2).toFixed(2), 10)
					this.overlayOffset.top = parseInt(((this.data.size.y - AgentData.sprite.blob_frames.height) / 2).toFixed(2), 10)
				} else if (this.color == "merlin") {
					
					spriteData = {
						images: ["./img/agents/" + this.color + ".png"],
						frames: AgentData.sprite.merlin_frames,
						animations: AgentData.sprite.merlin_animations
					};
					this.overlayOffset.left = parseInt(((this.data.size.x - AgentData.sprite.merlin_frames.width) / 2).toFixed(2), 10)
					this.overlayOffset.top = parseInt(((this.data.size.y - AgentData.sprite.merlin_frames.height) / 2).toFixed(2), 10)
				} else if (this.color == "robby") {
					
					spriteData = {
						images: ["./img/agents/" + this.color + ".png"],
						frames: AgentData.sprite.merlin_frames,
						animations: AgentData.sprite.robby_animations
					};
					this.overlayOffset.left = parseInt(((this.data.size.x - AgentData.sprite.merlin_frames.width) / 2).toFixed(2), 10)
					this.overlayOffset.top = parseInt(((this.data.size.y - AgentData.sprite.merlin_frames.height) / 2).toFixed(2), 10)
					
				} else if (this.color == "blob") {
					
					spriteData = {
						images: ["./img/agents/" + this.color + ".png"],
						frames: AgentData.sprite.blob_frames,
						animations: AgentData.sprite.blob_animations
					};
					this.overlayOffset.left = parseInt(((this.data.size.x - AgentData.sprite.blob_frames.width) / 2).toFixed(2), 10)
					this.overlayOffset.top = parseInt(((this.data.size.y - AgentData.sprite.blob_frames.height) / 2).toFixed(2), 10)
				} else if (this.color == "maxalert") {
					
					spriteData = {
						images: ["./img/agents/" + this.color + ".png"],
						frames: AgentData.sprite.maxalert_frames,
						animations: AgentData.sprite.maxalert_animations
					};
					this.overlayOffset.left = parseInt(((this.data.size.x - AgentData.sprite.maxalert_frames.width) / 2).toFixed(2), 10)
					this.overlayOffset.top = parseInt(((this.data.size.y - AgentData.sprite.maxalert_frames.height) / 2).toFixed(2), 10)
				} else {
					this.overlayOffset.left = 0;
					this.overlayOffset.top = 0;
				}
                this.sprite = new createjs.Sprite(new createjs.SpriteSheet(spriteData), hide ? "gone" : "idle");
            }
				*/
                
                var spriteData = {
                    images: ["./img/agents/" + this.color + ".png"],
                    frames:
                        this.color == "peedy"
                            ? AgentData.sprite.peedy_frames
                            : this.color == "merlin"
                            ? AgentData.sprite.merlin_frames
                            : this.color == "maxalert"
                            ? AgentData.sprite.maxalert_frames
                            : (this.color == "blob" || this.color == "genie")
                            ? AgentData.sprite.blob_frames
                            : this.color == "robby"
                            ? AgentData.sprite.merlin_frames
                            : this.color == "marisa"
                            ? AgentData.sprite.marisa_frames
                            : this.color == "reimu"
                            ? AgentData.sprite.reimu_frames
                            : this.color == "james"
                            ? AgentData.sprite.james_frames
                            : (this.color == "clippit" || this.color == "mnature" || this.color == "logo" || this.color == "offcat" || this.color == "genius" || this.color == "f1" || this.color == "rocky")
                            ? AgentData.sprite.clippit_frames
							: (this.color == "rover")
                            ? AgentData.sprite.rover_frames
							: (this.color == "kinito")
                            ? AgentData.sprite.kinito_frames
                            : AgentData.sprite.frames,
                    animations: 
                        this.color == "peedy"
                            ? AgentData.sprite.peedy_animations
                            : this.color == "merlin"
                            ? AgentData.sprite.merlin_animations
                            : this.color == "maxalert"
                            ? AgentData.sprite.maxalert_animations
                            : this.color == "blob"
                            ? AgentData.sprite.blob_animations
                            : this.color == "genie"
                            ? AgentData.sprite.genie_animations
                            : this.color == "robby"
                            ? AgentData.sprite.robby_animations
                            : this.color == "marisa"
                            ? AgentData.sprite.marisa_animations
                            : this.color == "mnature"
                            ? AgentData.sprite.mnature_animations
                            : this.color == "reimu"
                            ? AgentData.sprite.reimu_animations
                            : this.color == "james"
                            ? AgentData.sprite.james_animations
                            : this.color == "clippit"
                            ? AgentData.sprite.clippit_animations
                            : this.color == "logo"
                            ? AgentData.sprite.logo_animations
                            : this.color == "offcat"
                            ? AgentData.sprite.offcat_animations
                            : this.color == "genius"
                            ? AgentData.sprite.genius_animations
                            : this.color == "f1"
                            ? AgentData.sprite.f1_animations
                            : this.color == "rocky"
                            ? AgentData.sprite.rocky_animations
                            : this.color == "kinito"
                            ? AgentData.sprite.kinito_animations
                            : (this.color == "kern3l" || this.color == "siobhan" || this.color == "commo" || this.color == "nono" || this.color == "plankton" || this.color == "squidward" || this.color == "peetzuh" || this.color == "bluestickman")
                            ? AgentData.sprite.template_animations
							: (this.color == "rover")
                            ? AgentData.sprite.rover_animations
							: (this.color == "bonzi")
                            ? AgentData.sprite.bonzi_animations
							: (this.color == "ban")
                            ? AgentData.sprite.ban_animations
                            : AgentData.sprite.animations,
                };
            this.sprite = new createjs.Sprite(new createjs.SpriteSheet(spriteData));
            this.sprite.gotoAndPlay("idle");
            if (this.color == "peedy") {
                this.overlayOffset.left = parseInt(((this.data.size.x - AgentData.sprite.peedy_frames.width) / 2).toFixed(2), 10);
                this.overlayOffset.top = parseInt(((this.data.size.y - AgentData.sprite.peedy_frames.height) / 2).toFixed(2), 10);
            } else if (this.color == "james") {
                this.overlayOffset.left = 0;
                this.overlayOffset.top = 0;
            } else if (this.color == "squidward") {
                this.overlayOffset.left = 0;
                this.overlayOffset.top = 0;
            } else if (this.color == "plankton") {
                this.overlayOffset.left = 0;
                this.overlayOffset.top = 0;
            } else if (this.color == "nono" || this.color == "siobhan" || this.color == "kern3l" || this.color == "peetzuh" || this.color == "commo" || this.color == "misoneme") {
                this.overlayOffset.left = 0;
                this.overlayOffset.top = 0;
            } else if (this.color == "reimu") {
                this.overlayOffset.left = parseInt(((this.data.size.x - AgentData.sprite.reimu_frames.width) / 2).toFixed(2), 10);
                this.overlayOffset.top = parseInt(((this.data.size.y - AgentData.sprite.reimu_frames.height) / 2).toFixed(2), 10);
            } else if (this.color == "marisa") {
                this.overlayOffset.left = parseInt(((this.data.size.x - AgentData.sprite.marisa_frames.width) / 2).toFixed(2), 10);
                this.overlayOffset.top = parseInt(((this.data.size.y - AgentData.sprite.marisa_frames.height) / 2).toFixed(2), 10);
            } else if (this.color == "clippit") {
                this.overlayOffset.left = parseInt(((this.data.size.x - AgentData.sprite.clippit_frames.width) / 2).toFixed(2), 10);
                this.overlayOffset.top = parseInt(((this.data.size.y - AgentData.sprite.clippit_frames.height) / 2).toFixed(2), 10);
            } else if (this.color == "rover") {
                this.overlayOffset.left = parseInt(((this.data.size.x - AgentData.sprite.rover_frames.width) / 2).toFixed(2), 10);
                this.overlayOffset.top = parseInt(((this.data.size.y - AgentData.sprite.rover_frames.height) / 2).toFixed(2), 10);
            } else if (this.color == "genius") {
                this.overlayOffset.left = parseInt(((this.data.size.x - AgentData.sprite.clippit_frames.width) / 2).toFixed(2), 10);
                this.overlayOffset.top = parseInt(((this.data.size.y - AgentData.sprite.clippit_frames.height) / 2).toFixed(2), 10);
            } else if (this.color == "logo") {
                this.overlayOffset.left = parseInt(((this.data.size.x - AgentData.sprite.clippit_frames.width) / 2).toFixed(2), 10);
                this.overlayOffset.top = parseInt(((this.data.size.y - AgentData.sprite.clippit_frames.height) / 2).toFixed(2), 10);
            } else if (this.color == "mnature") {
                this.overlayOffset.left = parseInt(((this.data.size.x - AgentData.sprite.clippit_frames.width) / 2).toFixed(2), 10);
                this.overlayOffset.top = parseInt(((this.data.size.y - AgentData.sprite.clippit_frames.height) / 2).toFixed(2), 10);
            } else if (this.color == "offcat") {
                this.overlayOffset.left = parseInt(((this.data.size.x - AgentData.sprite.clippit_frames.width) / 2).toFixed(2), 10);
                this.overlayOffset.top = parseInt(((this.data.size.y - AgentData.sprite.clippit_frames.height) / 2).toFixed(2), 10);
            } else if (this.color == "f1") {
                this.overlayOffset.left = parseInt(((this.data.size.x - AgentData.sprite.clippit_frames.width) / 2).toFixed(2), 10);
                this.overlayOffset.top = parseInt(((this.data.size.y - AgentData.sprite.clippit_frames.height) / 2).toFixed(2), 10);
            } else if (this.color == "rocky") {
                this.overlayOffset.left = parseInt(((this.data.size.x - AgentData.sprite.clippit_frames.width) / 2).toFixed(2), 10);
                this.overlayOffset.top = parseInt(((this.data.size.y - AgentData.sprite.clippit_frames.height) / 2).toFixed(2), 10);
            } else if (this.color == "genie") {
                this.overlayOffset.left = parseInt(((this.data.size.x - AgentData.sprite.blob_frames.width) / 2).toFixed(2), 10);
                this.overlayOffset.top = parseInt(((this.data.size.y - AgentData.sprite.blob_frames.height) / 2).toFixed(2), 10);
            } else if (this.color == "merlin") {
                this.overlayOffset.left = parseInt(((this.data.size.x - AgentData.sprite.merlin_frames.width) / 2).toFixed(2), 10);
                this.overlayOffset.top = parseInt(((this.data.size.y - AgentData.sprite.merlin_frames.height) / 2).toFixed(2), 10);
            } else if (this.color == "robby") {
                this.overlayOffset.left = parseInt(((this.data.size.x - AgentData.sprite.merlin_frames.width) / 2).toFixed(2), 10);
                this.overlayOffset.top = parseInt(((this.data.size.y - AgentData.sprite.merlin_frames.height) / 2).toFixed(2), 10);
            } else if (this.color == "blob") {
                this.overlayOffset.left = parseInt(((this.data.size.x - AgentData.sprite.blob_frames.width) / 2).toFixed(2), 10);
                this.overlayOffset.top = parseInt(((this.data.size.y - AgentData.sprite.blob_frames.height) / 2).toFixed(2), 10);
            } else if (this.color == "maxalert") {
                this.overlayOffset.left = parseInt(((this.data.size.x - AgentData.sprite.maxalert_frames.width) / 2).toFixed(2), 10);
                this.overlayOffset.top = parseInt(((this.data.size.y - AgentData.sprite.maxalert_frames.height) / 2).toFixed(2), 10);
            } else {
                this.overlayOffset.left = 0;
                this.overlayOffset.top = 0;
            }
            
        }
		if (isValidColor(this.color)) {
        	this.$oldCanvas.css("background-image",`url(./img/agents/${this.color}.png)`);
		} else {
        	this.$oldCanvas.css("background-image",`none`);
		}
        stage.addChild(this.sprite);
        this.move();
    }

    explode() {
        this.cancel();
        this.runSingleEvent([
            {
                type: "anim",
                anim: "surprised_fwd",
                ticks: 30,
            },
        ]);
        let explosion = document.createElement("div");
        explosion.className = "explosion";
        explosion.style.left = this.x + "px";
        explosion.style.top = this.y + "px";
        document.body.appendChild(explosion);
        //this.element.style.zIndex = "999999"; // show above chat log
        var _this = this;
        let rot = 0;
        let posX = this.x;
        let posY = this.y;
        let x = this.x;
        let y = this.y;
        let xx = 0;
        let yy = 0;
        let angvel = Math.random() * 30 + 20;
        if (Math.random() > 0.5) angvel *= -1;
        let xvel = Math.random() * 10 + 5;
        if (Math.random() > 0.5) xvel *= -1;
        let yvel = -20;
        let i = 0;
        let interval = setInterval(() => {
            i++;
            yvel += 2;
            rot += angvel;
            x += xvel;
            y += yvel;
            xx += xvel;
            yy += yvel;
            this.element.style.transform = `translate(${xx}px, ${yy}px) rotate(${rot}deg)`;
            this.sprite.x = x + this.overlayOffset.left;
            this.sprite.y = y + this.overlayOffset.top;
            this.sprite.rotation = rot;
            if (i > 120) {
                clearInterval(interval);
                explosion.remove();
            }
            AgentHandler.needsUpdate = true;
        }, 33);
        setTimeout(function(){
            clearInterval(interval);
            _this.element.style.transform = ``;
            _this.sprite.x = posX;
            _this.sprite.y = posY;
            _this.sprite.rotation = 0;
        }, 5000)
    }
    animate() {
        if (this.sprite.currentAnimation == "idle") {
            if (this.eventQueue.length == 0 && this.userPublic.color == "bonzi") {
                var i = Math.floor(Math.random() * 15);
                switch (i) {
                    case 1:
                        this.sprite.gotoAndPlay("taptaptap");
                        break;
                    case 2:
                        this.sprite.gotoAndPlay("look_up");
                        break;
                    case 3:
                        this.sprite.gotoAndPlay("look_down");
                        break;
                    case 4:
                        this.sprite.gotoAndPlay("look_left");
                        break;
                    case 5:
                        this.sprite.gotoAndPlay("look_right");
                        break;
                    case 9:
                        this.sprite.gotoAndPlay("cool");
                        break;
                    case 10:
                        this.sprite.gotoAndPlay("juggle");
                        break;
                    case 11:
                        this.sprite.gotoAndPlay("yawn");
                        break;
                    case 12:
                        this.sprite.gotoAndPlay("banana_eat");
                        break;
                    case 13:
                        this.sprite.gotoAndPlay("banana_eat_miss");
                        break;
                    case 14:
                        this.sprite.gotoAndPlay("write");
                        break;
                    default:
                        this.sprite.gotoAndPlay("breathe");
                        break;
                }
            }
        }
    }
}
var AgentData = {
    size: {
        x: 200,
        y: 160,
    },
    sprite: {
        frames: { width: 200, height: 160 },
        peedy_frames: { width: 160, height: 128 },
        clippit_frames: { width: 124, height: 93 },
        kinito_frames: { width: 192, height: 128 },
        merlin_frames: { width: 128, height: 128 },
        rover_frames: { width: 80, height: 80 },
        blob_frames: { width: 128, height: 128 },
        maxalert_frames: { width: 168, height: 142 },
        james_frames: { width: 150, height: 187 },
        reimu_frames: { width: 128, height: 128 },
        marisa_frames: { width: 61, height: 109 },
		
		animations: {
			idle: [0],
            gone: 142,

            surf_intro: [1, 26, "idle", 1.0],
            surf_away: [27, 50, "gone", 1.0],

			shrug_fwd: {
				frames: range(51, 61), 
				next: "shrug_still",
				speed: 1.0
			},
			shrug_still: 61,
			shrug_back: {
				frames: range(61, 51), 
				next: "idle",
				speed: 1.0
			},

			earth_fwd: {
				frames: range(63, 69), 
				next: "earth_still",
				speed: 1.0
			},
			earth_still: {
				frames: range(70, 91), 
				next: "earth_still",
				speed: 1.0
			},
			earth_back: {
				frames: range(92, 97), 
				next: "idle",
				speed: 1.0
			},

			cool_fwd: {
				frames: range(98, 114), 
				next: "cool_still",
				speed: 1.0
			},
			cool_still: 115,
			cool_back: {
				frames: range(114, 98), 
				next: "idle",
				speed: 1.0
			},

			praise_fwd: {
				frames: range(116, 119), 
				next: "praise_still",
				speed: 1.0
			},
			praise_still: 120,
			praise_back: {
				frames: range(119, 116), 
				next: "idle",
				speed: 1.0
			},


			grin_fwd: {
				frames: range(121, 127), 
				next: "grin_still",
				speed: 1.0
			},
			grin_still: 128,
			grin_back: {
				frames: range(123, 121), 
				next: "idle",
				speed: 1.0
			},

			backflip: [129, 141, "idle", 1.0]
		},
        // essentially the same as regular bonzi
		ban_animations: {
			idle: [0],
            gone: 142,

            surf_intro: [1, 26, "surf_intro2", 1],
            surf_intro2: [98, 109, "idle", 1],
            surf_away2: [27, 50, "gone", 1],
			surf_away: {
				frames: range(109, 98), 
				next: "surf_away2",
				speed: 1
			},

			shrug_fwd: {
				frames: range(51, 61), 
				next: "shrug_still",
				speed: 1.0
			},
			shrug_still: 61,
			shrug_back: {
				frames: range(61, 51), 
				next: "idle",
				speed: 1.0
			},

			earth_fwd: {
				frames: range(63, 69), 
				next: "earth_still",
				speed: 1.0
			},
			earth_still: {
				frames: range(70, 91), 
				next: "earth_still",
				speed: 1.0
			},
			earth_back: {
				frames: range(92, 97), 
				next: "idle",
				speed: 1.0
			},

			cool_fwd: {
				frames: range(98, 114), 
				next: "cool_still",
				speed: 1.0
			},
			cool_still: 115,
			cool_back: {
				frames: range(114, 98), 
				next: "idle",
				speed: 1.0
			},

			praise_fwd: {
				frames: range(116, 119), 
				next: "praise_still",
				speed: 1.0
			},
			praise_still: 120,
			praise_back: {
				frames: range(119, 116), 
				next: "idle",
				speed: 1.0
			},


			grin_fwd: {
				frames: range(121, 127), 
				next: "grin_still",
				speed: 1.0
			},
			grin_still: 128,
			grin_back: {
				frames: range(123, 121), 
				next: "idle",
				speed: 1.0
			},

			backflip: [129, 141, "idle", 1.0]
		},
        bonzi_animations: {
            idle: 0,
            surf_intro: [1139, 1164, "idle", 1.0],
            surf_away: [1165, 1188, "gone", 1.0],
            gone: 1139,

            laugh: {
                frames: [0, 1019, 1020, 1021, 1022, 1023, 1021, 1022, 1021, 1023, 1022, 1021, 1023, 1022, 1023, 1021, 1022, 1023, 1021, 1020, 0],
                next: "idle",
                speed: 1.0,
            },
            surprised_fwd: {
                frames: [0, 306, 307, 308, 309, 310, 311, 312, 312, 312, 312],
                next: "surprised_still",
                speed: 1.0,
            },
            surprised_still: 312,
            surprised_back: {
                frames: [324, 325, 326, 0],
                next: "idle",
                speed: 1.0,
            },
            unbelievable_fwd: {
                frames: [0, 1117, 1118, 1119, 1120, 1118, 1120, 1121, 1122, 1124, 1126, 1128],
                next: "unbelievable_still",
                speed: 1.0,
            },
            unbelievable_still: 1128,
            unbelievable_back: {
                frames: [1136, 1137, 1138, 0],
                next: "idle",
                speed: 1.0,
            },
            clicked: {
                frames: [0, 306, 307, 308, 309, 310, 311, 312, 312, 312, 312, 324, 325, 326, 0],
                next: "idle",
                speed: 1.0,
            },
            surf_across_fwd: [1203, 1211, "surf_across_still", 1.0],
            surf_across_still: 1211,
            surf_across_back: {
                frames: range(1212, 1217),
                next: "idle",
                speed: 1.0,
            },

            clap_fwd: {
                frames: [0, 74, 75, 76, 77, 78, 77, 78, 77, 78, 77, 79],
                next: "clap_still",
                speed: 1.0,
            },
            clap_still: 79,
            clap_back: {
                frames: range(75, 74),
                next: "idle",
                speed: 1.0,
            },

            fact_fwd: {
                frames: [779, 778, 777, 776, 775, 775, 775, 774, 773, 772, 780, 781, 782, 783, 784, 785, 758, 758, 758, 758, 758, 758, 758, 758, 758, 758, 761, 762, 763, 764],
                next: "fact_still",
                speed: 1.0,
            },
            fact_still: 764,
            fact_back: {
                frames: range(772, 779),
                next: "idle",
                speed: 1.0,
            },
            muted_fwd: {
                frames: [481, 482, 483, 484, 485, 486, 487],
                next: "muted_still",
                speed: 1.0,
            },
            muted_still: 487,
            muted_back: {
                frames: range(487, 481),
                next: "idle",
                speed: 1.0,
            },
            write: {
                frames: [
                    0,
                    377,
                    376,
                    375,
                    374,
                    373,
                    373,
                    373,
                    373,
                    373,
                    372,
                    371,
                    370,
                    369,
                    368,
                    367,
                    366,
                    678,
                    679,
                    680,
                    681,
                    682,
                    683,
                    684,
                    685,
                    686,
                    686,
                    686,
                    686,
                    687,
                    688,
                    681,
                    682,
                    683,
                    684,
                    685,
                    686,
                    686,
                    686,
                    686,
                    687,
                    688,
                    681,
                    682,
                    683,
                    684,
                    685,
                    686,
                    686,
                    686,
                    686,
                    687,
                    688,
                    681,
                    682,
                    683,
                    684,
                    685,
                    686,
                    686,
                    686,
                    686,
                    687,
                    688,
                    725,
                    726,
                    727,
                    728,
                    728,
                    728,
                    728,
                    728,
                    728,
                    728,
                    728,
                    728,
                    728,
                    728,
                    728,
                    728,
                    728,
                    728,
                    728,
                    728,
                    727,
                    726,
                    725,
                    723,
                    681,
                    682,
                    683,
                    684,
                    685,
                    686,
                    686,
                    686,
                    686,
                    687,
                    688,
                    681,
                    682,
                    683,
                    684,
                    685,
                    686,
                    686,
                    686,
                    686,
                    687,
                    688,
                    680,
                    679,
                    678,
                    724,
                    724,
                    724,
                    724,
                    724,
                    367,
                    368,
                    369,
                    370,
                    371,
                    372,
                    373,
                    373,
                    373,
                    373,
                    373,
                    374,
                    375,
                    376,
                    377,
                    378,
                    0,
                ],
                next: "idle",
                speed: 1.0,
            },
            wink: {
                frames: [0, 1013, 1014, 1015, 1016, 1017, 1018, 1017, 1016, 1016, 1016, 1016, 1015, 1014, 1013, 0],
                next: "idle",
                speed: 1.0,
            },
            sleep_fwd: {
                frames: [
                    0,
                    507,
                    508,
                    509,
                    510,
                    511,
                    511,
                    511,
                    511,
                    511,
                    511,
                    511,
                    511,
                    511,
                    511,
                    511,
                    511,
                    511,
                    511,
                    511,
                    510,
                    509,
                    507,
                    507,
                    507,
                    507,
                    507,
                    507,
                    507,
                    507,
                    507,
                    507,
                    507,
                    507,
                    508,
                    508,
                    509,
                    510,
                    511,
                    512,
                    512,
                    512,
                    512,
                    512,
                    512,
                    512,
                    512,
                    512,
                    512,
                    512,
                    512,
                    512,
                    512,
                    511,
                    510,
                    510,
                    510,
                    510,
                    510,
                    510,
                    510,
                    510,
                    510,
                    510,
                    510,
                    510,
                    510,
                    510,
                    511,
                    512,
                    513,
                    514,
                    515,
                    515,
                    515,
                    515,
                    515,
                    515,
                    515,
                    515,
                    515,
                    515,
                    515,
                    515,
                    515,
                    515,
                    515,
                    516,
                    517,
                    518,
                    519,
                    520,
                    521,
                ],
                next: "sleep_still",
                speed: 1.0,
            },
            sleep_still: {
                frames: [
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    522,
                    523,
                    524,
                    525,
                    525,
                    525,
                    525,
                    525,
                    525,
                    525,
                    525,
                    525,
                    525,
                    525,
                    525,
                    525,
                    525,
                    525,
                    525,
                    525,
                    525,
                    525,
                    525,
                    525,
                    525,
                    525,
                    524,
                    523,
                    522,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                    521,
                ],
                next: "sleep_still",
                speed: 1.0,
            },
            sleep_back: {
                frames: [526, 527, 528, 529, 530, 531, 532, 533, 534, 535],
                next: "idle",
                speed: 1.0,
            },
            banana_eat: {
                frames: [
                    0,
                    826,
                    827,
                    828,
                    829,
                    830,
                    831,
                    832,
                    833,
                    834,
                    835,
                    836,
                    837,
                    838,
                    839,
                    840,
                    841,
                    842,
                    843,
                    844,
                    845,
                    846,
                    847,
                    848,
                    849,
                    850,
                    851,
                    852,
                    853,
                    852,
                    851,
                    852,
                    854,
                    853,
                    852,
                    855,
                    856,
                    857,
                    858,
                    859,
                    860,
                    861,
                    862,
                    863,
                    864,
                    865,
                    866,
                    867,
                    868,
                    869,
                    870,
                    871,
                    872,
                    873,
                    874,
                    875,
                    876,
                    877,
                    878,
                    879,
                    880,
                    881,
                    882,
                    883,
                    884,
                    885,
                    886,
                    0,
                ],
                next: "idle",
                speed: 1.0,
            },
            banana_eat_miss: {
                frames: [
                    0,
                    1024,
                    1025,
                    1026,
                    1027,
                    1028,
                    1029,
                    1030,
                    1031,
                    1032,
                    1033,
                    1034,
                    1035,
                    1036,
                    1037,
                    1038,
                    1039,
                    1040,
                    1041,
                    1042,
                    1043,
                    1043,
                    1043,
                    1043,
                    1043,
                    1043,
                    1043,
                    1043,
                    1043,
                    1043,
                    1043,
                    1044,
                    1045,
                    1046,
                    1047,
                    1047,
                    1047,
                    1047,
                    1047,
                    1047,
                    1047,
                    1047,
                    1047,
                    1050,
                    1051,
                    1052,
                    1053,
                    1053,
                    1053,
                    1053,
                    1053,
                    1053,
                    1053,
                    1053,
                    1053,
                    1053,
                    1053,
                    1052,
                    1051,
                    1050,
                    1057,
                    1054,
                    1055,
                    1056,
                    1056,
                    1056,
                    1056,
                    1056,
                    1056,
                    1056,
                    1056,
                    1056,
                    1055,
                    1054,
                    1057,
                    1058,
                    1058,
                    1058,
                    1058,
                    1058,
                    1058,
                    1059,
                    1060,
                    1058,
                    1058,
                    1058,
                    1058,
                    1058,
                    1058,
                    1058,
                    1058,
                    1058,
                    1061,
                    1062,
                    1063,
                    1064,
                    1065,
                    1066,
                    1067,
                    1068,
                    1069,
                    1070,
                    1071,
                    0,
                ],
                next: "idle",
                speed: 1.0,
            },
            cool: {
                frames: [
                    0,
                    0,
                    438,
                    439,
                    440,
                    441,
                    442,
                    443,
                    444,
                    445,
                    446,
                    447,
                    448,
                    449,
                    450,
                    451,
                    452,
                    453,
                    454,
                    455,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    455,
                    454,
                    453,
                    452,
                    451,
                    450,
                    466,
                    467,
                    466,
                    450,
                    466,
                    467,
                    466,
                    450,
                    451,
                    452,
                    453,
                    454,
                    455,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    456,
                    455,
                    454,
                    453,
                    452,
                    451,
                    450,
                    449,
                    448,
                    447,
                    446,
                    445,
                    444,
                    443,
                    442,
                    441,
                    440,
                    439,
                    438,
                    0,
                    0,
                ],
                next: "idle",
                speed: 1.0,
            },
            juggle: {
                frames: [
                    0,
                    643,
                    644,
                    645,
                    646,
                    647,
                    647,
                    647,
                    648,
                    649,
                    650,
                    651,
                    652,
                    653,
                    654,
                    655,
                    656,
                    657,
                    658,
                    655,
                    656,
                    657,
                    658,
                    655,
                    656,
                    657,
                    658,
                    655,
                    656,
                    657,
                    658,
                    655,
                    656,
                    657,
                    658,
                    655,
                    656,
                    657,
                    658,
                    655,
                    656,
                    657,
                    658,
                    655,
                    656,
                    657,
                    658,
                    655,
                    656,
                    657,
                    658,
                    655,
                    656,
                    657,
                    658,
                    655,
                    656,
                    657,
                    658,
                    655,
                    656,
                    657,
                    658,
                    655,
                    656,
                    657,
                    658,
                    655,
                    656,
                    657,
                    658,
                    655,
                    656,
                    657,
                    658,
                    655,
                    656,
                    657,
                    658,
                    659,
                    660,
                    661,
                    661,
                    661,
                    661,
                    661,
                    661,
                    650,
                    649,
                    648,
                    647,
                    647,
                    647,
                    646,
                    645,
                    644,
                    643,
                    0,
                ],
                next: "idle",
                speed: 1.0,
            },

            look_left: {
                frames: [
                    0,
                    419,
                    420,
                    421,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    422,
                    421,
                    420,
                    419,
                ],
                next: "idle",
                speed: 1.0,
            },

            look_right: {
                frames: [
                    0,
                    1007,
                    1008,
                    1009,
                    1010,
                    1010,
                    1010,
                    1010,
                    1010,
                    1010,
                    1010,
                    1010,
                    1010,
                    1010,
                    1010,
                    1010,
                    1010,
                    1010,
                    1010,
                    1010,
                    1010,
                    1010,
                    1010,
                    1010,
                    1010,
                    1010,
                    1010,
                    1010,
                    1010,
                    1010,
                    1010,
                    1010,
                    1010,
                    1010,
                    1010,
                    1010,
                    1010,
                    1010,
                    1010,
                    1010,
                    1010,
                    1010,
                    1009,
                    1008,
                    1007,
                ],
                next: "idle",
                speed: 1.0,
            },

            look_down: {
                frames: [
                    413,
                    414,
                    415,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    416,
                    415,
                    414,
                    413,
                ],
                next: "idle",
                speed: 1.0,
            },

            look_up: {
                frames: [
                    0,
                    425,
                    426,
                    427,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    428,
                    427,
                    426,
                    425,
                    0,
                ],
                next: "idle",
                speed: 1.0,
            },

            breathe: {
                frames: [0, 41, 42, 43, 44, 45, 46, 46, 46, 46, 45, 44, 43, 42, 41, 0],
                next: "idle",
                speed: 1.0,
            },

            taptaptap: {
                frames: [0, 999, 1000, 1001, 1002, 1002, 1002, 1002, 1002, 1002, 1002, 1001, 1000, 999, 1003, 1004, 1005, 1006, 1006, 1006, 1006, 1006, 1006, 1006, 1006, 1006, 1005, 1004, 1003, 0],
                next: "idle",
                speed: 1.0,
            },

            yawn: {
                frames: [0, 192, 193, 194, 195, 196, 197, 199, 200, 199, 197, 199, 200, 199, 197, 199, 200, 199, 197, 199, 200, 199, 197, 199, 200, 195, 194, 193, 192, 0],
                next: "idle",
                speed: 1.0,
            },
            shrug_fwd: [28, 33, "shrug_still", 1.0],
            shrug_still: 33,
            shrug_back: {
                frames: range(33, 28),
                next: "idle",
                speed: 1.0,
            },

            grin_fwd: [1083, 1087, "grin_still", 1.0],
            grin_still: 1087,
            grin_back: {
                frames: range(1085, 1083),
                next: "idle",
                speed: 1.0,
            },

            praise_fwd: [151, 155, "praise_still", 1.0],
            praise_still: 155,
            praise_back: {
                frames: range(155, 151),
                next: "idle",
                speed: 1.0,
            },
            backflip: [163, 175, "idle", 1.0],

            beat_fwd: {
                frames: [0, 431, 432, 433, 434, 435, 436, 437, 434, 435, 436, 437],
                next: "beat_back",
                speed: 1.0,
            },
            beat_back: {
                frames: range(432, 431),
                next: "idle",
                speed: 1.0,
            },
        },
        template_animations: {
            idle: 0,
            surf_intro: [0, 1, "idle", 1.0],
            surf_away: [0, 1, "gone", 1.0],
            gone: 1,
        },
        reimu_animations: {
            idle: {
                frames: range(0, 9),
                next: "idle",
                speed: 1.0,
            },
            surf_intro: [9, 0, "idle", 1.0],
            surf_away: [9, 10, "gone", 1.0],
            gone: 10,
        },
        marisa_animations: {
            idle: {
                frames: range(0, 9),
                next: "idle",
                speed: 1.0,
            },
            surf_intro: [9, 0, "idle", 1.0],
            surf_away: [9, 10, "gone", 1.0],
            gone: 10,
        },
        kinito_animations: {
            idle: {
                frames: 9,
                next: "idle",
                speed: 1.0,
            },
            surf_intro: [410,424, "idle", 1.0],
            surf_away: [147, 169, "gone", 1.0],
            shrug_fwd: [119, 123, "shrug_still", 1.0],
            shrug_still: 123,
            shrug_back: {
                frames: range(123, 119),
                next: "idle",
                speed: 1.0,
            },
            gone: 558,
        },
        peedy_animations: {
            idle: 0,

            surf_across_fwd: [1, 8, "surf_across_still", 1.0],
            surf_across_still: 9,
            surf_across_back: {
                frames: range(8, 1),
                next: "idle",
                speed: 1.0,
            },

            clap_fwd: [10, 12, "clap_still", 1.0],
            clap_still: [13, 15, "clap_still", 1.0],
            clap_back: {
                frames: range(12, 10),
                next: "idle",
                speed: 1.0,
            },

            surf_intro: [6, 28, "idle", 1.0],
            surf_away: [377, 400, "gone", 1.0],

            gone: 400,

            shrug_fwd: [253, 260, "shrug_still", 1.0],
            shrug_still: 260,
            shrug_back: {
                frames: range(260, 253),
                next: "idle",
                speed: 1.0,
            },

            earth_fwd: [575, 581, "earth_still", 1.0],
            earth_still: [584, 616, "earth_still", 1.0],
            earth_back: {
                frames: range(580, 575),
                speed: 1.0,
                next: "idle",
            },

            // TODO: ADD BLINK
            look_down_fwd: [218, 222, "look_down_still", 1.0],
            look_down_still: 222,
            look_down_back: {
                frames: range(222, 218),
                next: "idle",
                speed: 1.0,
            },

            // TODO: ADD BLINK
            lean_left_fwd: [94, 97, "lean_left_still", 1.0],
            lean_left_still: 98,
            lean_left_back: {
                frames: range(97, 94),
                next: "idle",
                speed: 1.0,
            },

            surprised_fwd: {
                frames: [0, 294, 295, 296, 296, 297, 298, 299, 300, 300, 300, 300, 303, 304],
                next: "surprised_still",
                speed: 1.0,
            },
            surprised_still: 304,
            surprised_back: {
                frames: [312, 313, 314],
                next: "idle",
                speed: 1.0,
            },
            clicked: {
                frames: [0, 294, 295, 296, 296, 297, 298, 299, 300, 300, 300, 300, 303, 304, 304, 304, 304, 304, 312, 313, 314],
                next: "idle",
                speed: 1.0,
            },
            cool: {
                frames: [
                    617,
                    618,
                    619,
                    620,
                    620,
                    620,
                    620,
                    620,
                    620,
                    621,
                    622,
                    623,
                    624,
                    625,
                    626,
                    627,
                    628,
                    629,
                    630,
                    631,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    633,
                    634,
                    635,
                    635,
                    635,
                    635,
                    635,
                    635,
                    635,
                    635,
                    635,
                    635,
                    634,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    636,
                    637,
                    638,
                    638,
                    638,
                    638,
                    638,
                    638,
                    638,
                    638,
                    638,
                    638,
                    638,
                    637,
                    636,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    631,
                    630,
                    629,
                    628,
                    627,
                    626,
                    625,
                    624,
                    623,
                    622,
                    621,
                    620,
                    619,
                    618,
                    617,
                    0,
                ],
                next: "idle",
                speed: 1.0,
            },
            cool_peedy: {
                frames: [
                    617,
                    618,
                    619,
                    620,
                    620,
                    620,
                    620,
                    620,
                    620,
                    621,
                    622,
                    623,
                    624,
                    625,
                    626,
                    627,
                    628,
                    629,
                    630,
                    631,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    633,
                    634,
                    635,
                    635,
                    635,
                    635,
                    635,
                    635,
                    635,
                    635,
                    635,
                    635,
                    634,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    636,
                    637,
                    638,
                    638,
                    638,
                    638,
                    638,
                    638,
                    638,
                    638,
                    638,
                    638,
                    638,
                    637,
                    636,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    632,
                    631,
                    630,
                    629,
                    628,
                    627,
                    626,
                    625,
                    624,
                    623,
                    622,
                    621,
                    620,
                    619,
                    618,
                    617,
                    0,
                ],
                next: "idle",
                speed: 1.0,
            },

            cool_fwd: [108, 126, "cool_still", 1.0],
            cool_still: 126,
            cool_back: {
                frames: range(124, 108),
                next: "idle",
                speed: 1.0,
            },

            cool_right_fwd: [126, 128, "cool_right_still", 1.0],
            cool_right_still: 129,
            cool_right_back: {
                frames: range(128, 126),
                next: "idle",
                speed: 1.0,
            },

            cool_left_fwd: [131, 133, "cool_left_still", 1.0],
            cool_left_still: 134,
            cool_left_back: {
                frames: range(133, 131),
                next: "cool_still",
                speed: 1.0,
            },

            cool_adjust: {
                frames: [124, 123, 122, 121, 120, 135, 136, 135, 120, 121, 122, 123, 124],
                next: "cool_still",
                speed: 1.0,
            },

            present_fwd: [137, 141, "present_still", 1.0],
            present_still: 142,
            present_back: {
                frames: range(141, 137),
                next: "idle",
                speed: 1.0,
            },

            look_left_fwd: [143, 145, "look_left_still", 1.0],
            look_left_still: 146,
            look_left_back: {
                frames: range(145, 143),
                next: "idle",
                speed: 1.0,
            },

            look_left: {
                frames: [0, 225, 226, 227, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 228, 227, 226, 225, 0],
                next: "idle",
                speed: 1.0,
            },

            look_right: {
                frames: [0, 950, 951, 952, 953, 953, 953, 953, 953, 953, 953, 953, 953, 953, 953, 953, 953, 953, 953, 953, 953, 953, 953, 953, 953, 953, 953, 953, 953, 953, 953, 953, 953, 953, 953, 953, 953, 952, 951, 950, 0],
                next: "idle",
                speed: 1.0,
            },

            look_down: {
                frames: [0, 218, 219, 220, 221, 222, 222, 222, 222, 222, 222, 222, 222, 222, 222, 222, 222, 222, 222, 222, 222, 222, 222, 222, 222, 222, 222, 222, 222, 222, 222, 222, 222, 222, 222, 222, 222, 221, 220, 219, 218, 0],
                next: "idle",
                speed: 1.0,
            },

            look_right_fwd: [149, 151, "look_right_still", 1.0],
            look_right_still: 152,
            look_right_back: {
                frames: range(151, 149),
                next: "idle",
                speed: 1.0,
            },

            lean_right_fwd: {
                frames: range(158, 156),
                next: "lean_right_still",
                speed: 1.0,
            },
            lean_right_still: 155,
            lean_right_back: [156, 158, "idle", 1.0],

            praise_fwd: [91, 95, "praise_still", 1.0],
            praise_still: 95,
            praise_back: {
                frames: range(95, 91),
                next: "idle",
                speed: 1.0,
            },

            grin_fwd: [743, 753, "grin_still", 1.0],
            grin_still: 747,
            grin_back: {
                frames: range(747, 743),
                next: "idle",
                speed: 1.0,
            },

            taptaptap: {
                frames: [177, 178, 179, 180, 181],
                next: "idle",
                speed: 1.0,
            },

            breathe: {
                frames: [342, 343, 344, 345, 346, 347, 348, 348, 348, 348, 348, 348, 347, 346, 345, 344, 343, 342],
                next: "idle",
                speed: 1.0,
            },

            backflip: {
                frames: [0, 412, 413, 414, 415, 416, 416, 417, 418, 419, 420, 419, 418, 417, 416, 415, 414, 413, 412, 0],
                next: "idle",
                speed: 1.0,
            },
            sleep_fwd: {
                frames: [0, 919, 964, 964, 964, 964, 967, 969, 969, 970],
                next: "sleep_still",
                speed: 1.0,
            },
            sleep_still: {
                frames: [
                    970,
                    970,
                    970,
                    970,
                    970,
                    970,
                    970,
                    970,
                    970,
                    970,
                    970,
                    970,
                    970,
                    970,
                    970,
                    970,
                    970,
                    970,
                    970,
                    970,
                    970,
                    970,
                    970,
                    970,
                    970,
                    971,
                    972,
                    973,
                    974,
                    975,
                    976,
                    976,
                    976,
                    976,
                    976,
                    976,
                    976,
                    976,
                    976,
                    976,
                    975,
                    974,
                    973,
                    972,
                    971,
                    970,
                ],
                next: "sleep_still",
                speed: 1.0,
            },
            sleep_back: {
                frames: [970, 969, 969, 967, 674, 919, 0],
                next: "idle",
                speed: 1.0,
            },
        },
        genie_animations: {
            idle: 0,

            surf_across_fwd: [1, 8, "surf_across_still", 1.0],
            surf_across_still: 9,
            surf_across_back: {
                frames: range(8, 1),
                next: "idle",
                speed: 1.0,
            },

            clap_fwd: [577, 581, "clap_still", 1.0],
            clap_still: [579, 581, "clap_still", 1.0],
            clap_back: {
                frames: range(578, 577),
                next: "idle",
                speed: 1.0,
            },

            surf_intro: [86, 95, "idle", 1.0],
            surf_away: [96, 106, "gone", 1.0],

            gone: 590,

            shrug_fwd: [271, 275, "shrug_still", 1.0],
            shrug_still: 275,
            shrug_back: {
                frames: range(275, 271),
                next: "idle",
                speed: 1.0,
            },

            earth_fwd: [385, 391, "earth_still", 0.6],
            earth_still: [391, 396, "earth_still", 0.6],
            earth_back: [397, 402, "idle", 0.6],

            cool: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },
            cool_peedy: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },

            present_fwd: [107, 111, "present_still", 1.0],
            present_still: 111,
            present_back: {
                frames: range(111, 107),
                next: "idle",
                speed: 1.0,
            },

            look_left: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },

            look_right: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },

            look_down: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },

            praise_fwd: [361, 365, "praise_still", 1.0],
            praise_still: 365,
            praise_back: {
                frames: range(365, 361),
                next: "idle",
                speed: 1.0,
            },

            grin_fwd: [161, 165, "grin_still", 1.0],
            grin_still: 165,
            grin_back: {
                frames: range(165, 161),
                next: "idle",
                speed: 1.0,
            },

            taptaptap: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },

            breathe: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },
        },
        merlin_animations: {
            idle: 0,

            surf_across_fwd: [1, 8, "surf_across_still", 1.0],
            surf_across_still: 9,
            surf_across_back: {
                frames: range(8, 1),
                next: "idle",
                speed: 1.0,
            },

            clap_fwd: [445, 457, "clap_still", 1.0],
            clap_still: [349, 350, "clap_still", 1.0],
            clap_back: {
                frames: range(349, 345),
                next: "idle",
                speed: 1.0,
            },

            surf_intro: [128, 136, "idle", 1.0],
            surf_away: [137, 149, "gone", 1.0],

            gone: 613,

            shrug_fwd: [174, 178, "shrug_still", 1.0],
            shrug_still: 178,
            shrug_back: {
                frames: range(178, 174),
                next: "idle",
                speed: 1.0,
            },

            earth_fwd: [186, 190, "earth_still", 0.6],
            earth_still: [190, 199, "earth_still", 0.6],
            earth_back: {
                frames: range(190, 186),
                next: "idle",
                speed: 1.0,
            },

            cool: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },
            cool_peedy: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },

            present_fwd: [117, 120, "present_still", 1.0],
            present_still: 120,
            present_back: {
                frames: range(120, 117),
                next: "idle",
                speed: 1.0,
            },

            look_left: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },

            look_right: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },

            look_down: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },

            praise_fwd: [82, 86, "praise_still", 1.0],
            praise_still: 86,
            praise_back: {
                frames: range(86, 82),
                next: "idle",
                speed: 1.0,
            },

            grin_fwd: [345, 350, "grin_still", 1.0],
            grin_still: 350,
            grin_back: {
                frames: range(350, 345),
                next: "idle",
                speed: 1.0,
            },

            taptaptap: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },

            breathe: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },
        },
        robby_animations: {
            idle: 0,

            surf_across_fwd: [1, 8, "surf_across_still", 1.0],
            surf_across_still: 9,
            surf_across_back: {
                frames: range(8, 1),
                next: "idle",
                speed: 1.0,
            },

            clap_fwd: [121, 128, "shrug_still", 1.0],
            clap_still: 128,
            clap_back: {
                frames: range(121, 128),
                next: "idle",
                speed: 1.0,
            },

            surf_intro: [53, 70, "idle", 1.0],
            surf_away: [369, 389, "gone", 1.0],

            gone: 593,

            shrug_fwd: [175, 177, "shrug_still", 1.0],
            shrug_still: 177,
            shrug_back: {
                frames: range(177, 175),
                next: "idle",
                speed: 1.0,
            },

            earth_fwd: [290, 298, "earth_still", 1.0],
            earth_still: [300, 306, "earth_still", 1.0],
            earth_back: {
                frames: range(298, 290),
                next: "idle",
                speed: 1.0,
            },

            cool: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },
            cool_peedy: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },

            present_fwd: [207, 211, "present_still", 1.0],
            present_still: 211,
            present_back: {
                frames: range(211, 207),
                next: "idle",
                speed: 1.0,
            },

            look_left: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },

            look_right: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },

            look_down: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },

            praise_fwd: [219, 221, "praise_still", 1.0],
            praise_still: 221,
            praise_back: {
                frames: range(221, 119),
                next: "idle",
                speed: 1.0,
            },

            grin_fwd: [345, 350, "grin_still", 1.0],
            grin_still: 350,
            grin_back: {
                frames: range(350, 345),
                next: "idle",
                speed: 1.0,
            },

            taptaptap: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },

            breathe: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },
        },
        clippit_animations: {
            idle: 0,

            surf_across_fwd: [1, 8, "surf_across_still", 1.0],
            surf_across_still: 9,
            surf_across_back: {
                frames: range(8, 1),
                next: "idle",
                speed: 1.0,
            },

            clap_fwd: [10, 12, "clap_still", 1.0],
            clap_still: [13, 15, "clap_still", 1.0],
            clap_back: {
                frames: range(12, 10),
                next: "idle",
                speed: 1.0,
            },

            clicked: {
                frames: [210, 211, 212, 213, 214, 215, 216, 216, 216, 216, 216, 216, 216, 216, 216, 216, 217, 216, 216, 216, 216, 216, 216, 216, 216, 218, 211, 0],
                next: "idle",
                speed: 1.0,
            },
            wave: {
                frames: [210, 211, 212, 213, 214, 215, 216, 216, 216, 216, 216, 216, 216, 216, 216, 216, 217, 216, 216, 216, 216, 216, 216, 216, 216, 218, 211, 0],
                next: "idle",
                speed: 1.0,
            },
            surf_intro: {
                frames: [347, 346, 345, 489, 490, 491, 492, 493, 0],
                next: "idle",
                speed: 1.0,
            },
            surf_away: {
                frames: [0, 313, 314, 315, 316, 317, 318, 319, 320, 321, 322, 323, 324, 325, 326, 326, 326, 326, 327, 327, 327, 327, 326, 326, 326, 326, 328, 329, 330, 331, 332, 333, 334, 335, 336, 337, 338, 339, 340, 341, 342, 343, 344],
                next: "gone",
                speed: 1.0,
            },

            gone: 902,

            shrug_fwd: [89, 91, "shrug_still", 1.0],
            shrug_still: 91,
            shrug_back: {
                frames: range(91, 89),
                next: "idle",
                speed: 1.0,
            },

            earth_fwd: [777, 797, "earth_still", 1.0],
            earth_still: [797, 808, "earth_still", 1.0],
            earth_back: {
                frames: [808, 809, 810, 811, 784, 783, 782, 781, 780, 779, 778, 777, 0],
                next: "idle",
                speed: 1.0,
            },

            sleep_fwd: {
                frames: [0, 565, 566, 567, 568, 569, 570, 571, 572, 573, 574, 575, 576, 577, 578, 579, 580, 581, 582, 583, 584, 585, 586, 587, 588, 589, 590, 591],
                next: "sleep_still",
                speed: 1.0,
            },
            sleep_still: {
                frames: [591, 592, 593, 594, 595, 596, 597, 598, 599, 600, 601],
                next: "sleep_still",
                speed: 1.0,
            },
            sleep_back: {
                frames: [591, 645, 646, 647, 648, 649, 650, 0],
                next: "idle",
                speed: 1.0,
            },

            // TODO: ADD BLINK
            look_down_fwd: [218, 222, "look_down_still", 1.0],
            look_down_still: 222,
            look_down_back: {
                frames: range(222, 218),
                next: "idle",
                speed: 1.0,
            },

            // TODO: ADD BLINK
            lean_left_fwd: [94, 97, "lean_left_still", 1.0],
            lean_left_still: 98,
            lean_left_back: {
                frames: range(97, 94),
                next: "idle",
                speed: 1.0,
            },

            beat_fwd: [101, 103, "beat_still", 1.0],
            beat_still: [104, 107, "beat_still", 1.0],
            beat_back: {
                frames: range(103, 101),
                next: "idle",
                speed: 1.0,
            },

            cool: {
                frames: [
                    0,
                    130,
                    131,
                    132,
                    133,
                    134,
                    135,
                    136,
                    137,
                    138,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    135,
                    136,
                    137,
                    138,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    135,
                    136,
                    137,
                    138,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    140,
                    135,
                    136,
                    137,
                    138,
                    140,
                    141,
                    142,
                    143,
                    143,
                    144,
                    145,
                    146,
                    147,
                    148,
                    149,
                    150,
                    151,
                    152,
                    153,
                    154,
                    155,
                    156,
                    157,
                    158,
                    159,
                    160,
                    161,
                    0,
                ],
                next: "idle",
                speed: 1.0,
            },
            cool_peedy: {
                frames: [
                    0,
                    130,
                    131,
                    132,
                    133,
                    134,
                    135,
                    136,
                    137,
                    138,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    135,
                    136,
                    137,
                    138,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    135,
                    136,
                    137,
                    138,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    139,
                    140,
                    135,
                    136,
                    137,
                    138,
                    140,
                    141,
                    142,
                    143,
                    143,
                    144,
                    145,
                    146,
                    147,
                    148,
                    149,
                    150,
                    151,
                    152,
                    153,
                    154,
                    155,
                    156,
                    157,
                    158,
                    159,
                    160,
                    161,
                    0,
                ],
                next: "idle",
                speed: 1.0,
            },

            cool_fwd: [108, 126, "cool_still", 1.0],
            cool_still: 126,
            cool_back: {
                frames: range(124, 108),
                next: "idle",
                speed: 1.0,
            },

            cool_right_fwd: [126, 128, "cool_right_still", 1.0],
            cool_right_still: 129,
            cool_right_back: {
                frames: range(128, 126),
                next: "idle",
                speed: 1.0,
            },

            cool_left_fwd: [131, 133, "cool_left_still", 1.0],
            cool_left_still: 134,
            cool_left_back: {
                frames: range(133, 131),
                next: "cool_still",
                speed: 1.0,
            },

            cool_adjust: {
                frames: [124, 123, 122, 121, 120, 135, 136, 135, 120, 121, 122, 123, 124],
                next: "cool_still",
                speed: 1.0,
            },

            present_fwd: [25, 34, "present_still", 1.0],
            present_still: 34,
            present_back: {
                frames: range(29, 25),
                next: "idle",
                speed: 1.0,
            },

            look_left_fwd: [143, 145, "look_left_still", 1.0],
            look_left_still: 146,
            look_left_back: {
                frames: range(145, 143),
                next: "idle",
                speed: 1.0,
            },

            look_left: {
                frames: [0, 125, 126, 127, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 127, 126, 125, 0],
                next: "idle",
                speed: 1.0,
            },

            look_right: {
                frames: [0, 120, 121, 122, 123, 123, 123, 123, 123, 123, 123, 123, 123, 123, 123, 123, 123, 123, 123, 123, 123, 123, 122, 121, 120, 0],
                next: "idle",
                speed: 1.0,
            },

            look_down: {
                frames: [0, 110, 111, 112, 112, 112, 112, 112, 112, 112, 112, 112, 112, 112, 112, 112, 112, 113, 112, 112, 112, 113, 114, 0],
                next: "idle",
                speed: 1.0,
            },

            look_right_fwd: [149, 151, "look_right_still", 1.0],
            look_right_still: 152,
            look_right_back: {
                frames: range(151, 149),
                next: "idle",
                speed: 1.0,
            },

            lean_right_fwd: {
                frames: range(158, 156),
                next: "lean_right_still",
                speed: 1.0,
            },
            lean_right_still: 155,
            lean_right_back: [156, 158, "idle", 1.0],

            praise_fwd: {
                frames: [35, 36, 37, 38, 39, 40, 41, 39, 40, 41, 39, 40, 41, 42, 43, 44],
                next: "praise_still",
                speed: 1.0,
            },
            praise_still: 44,
            praise_back: {
                frames: range(38, 35),
                next: "idle",
                speed: 1.0,
            },

            grin_fwd: [743, 753, "grin_still", 1.0],
            grin_still: 747,
            grin_back: {
                frames: range(747, 743),
                next: "idle",
                speed: 1.0,
            },

            taptaptap: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },

            breathe: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },

            backflip: {
                frames: [0, 412, 413, 414, 415, 416, 416, 417, 418, 419, 420, 419, 418, 417, 416, 415, 414, 413, 412, 0],
                next: "idle",
                speed: 1.0,
            },
        },

        genius_animations: {
            idle: 0,

            surf_across_fwd: [1, 8, "surf_across_still", 1.0],
            surf_across_still: 9,
            surf_across_back: {
                frames: range(8, 1),
                next: "idle",
                speed: 1.0,
            },

            clap_fwd: [339, 360, "clap_still", 0.6],
            clap_still: 360,
            clap_back: {
                frames: range(358, 353),
                next: "idle",
                speed: 0.6,
            },

            earth_fwd: [626, 636, "earth_still", 1.0],
            earth_still: [636, 653, "earth_still", 1.0],
            earth_back: {
                frames: range(653, 666),
                speed: 1.0,
                next: "idle",
            },

            surf_intro: {
                frames: [297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311, 312, 313, 314, 315, 316, 317, 318, 319, 320, 321, 322, 323, 324, 9, 2, 1, 0],
                next: "idle",
                speed: 1,
            },
            surf_away: {
                frames: [0, 83, 1, 2, 3, 408, 409, 410, 409, 408, 411, 412, 413, 414, 415, 416, 417, 418, 419, 420, 421, 422, 423, 424, 425, 426, 427],
                next: "gone",
                speed: 1,
            },

            gone: 692,

            shrug_fwd: [89, 91, "shrug_still", 1.0],
            shrug_still: 91,
            shrug_back: {
                frames: range(91, 89),
                next: "idle",
                speed: 1.0,
            },

            earth_fwd: [626, 636, "earth_still", 1.0],
            earth_still: [636, 653, "earth_still", 1.0],
            earth_back: {
                frames: range(654, 666),
                next: "idle",
                speed: 1.0,
            },

            // TODO: ADD BLINK
            look_down_fwd: [218, 222, "look_down_still", 1.0],
            look_down_still: 222,
            look_down_back: {
                frames: range(222, 218),
                next: "idle",
                speed: 1.0,
            },

            // TODO: ADD BLINK
            lean_left_fwd: [94, 97, "lean_left_still", 1.0],
            lean_left_still: 98,
            lean_left_back: {
                frames: range(97, 94),
                next: "idle",
                speed: 1.0,
            },

            beat_fwd: [101, 103, "beat_still", 1.0],
            beat_still: [104, 107, "beat_still", 1.0],
            beat_back: {
                frames: range(103, 101),
                next: "idle",
                speed: 1.0,
            },

            cool: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },
            cool_peedy: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },

            cool_fwd: [108, 126, "cool_still", 1.0],
            cool_still: 126,
            cool_back: {
                frames: range(124, 108),
                next: "idle",
                speed: 1.0,
            },

            cool_right_fwd: [126, 128, "cool_right_still", 1.0],
            cool_right_still: 129,
            cool_right_back: {
                frames: range(128, 126),
                next: "idle",
                speed: 1.0,
            },

            cool_left_fwd: [131, 133, "cool_left_still", 1.0],
            cool_left_still: 134,
            cool_left_back: {
                frames: [0],
                next: "cool_still",
                speed: 1.0,
            },

            cool_adjust: {
                frames: [124, 123, 122, 121, 120, 135, 136, 135, 120, 121, 122, 123, 124],
                next: "cool_still",
                speed: 1.0,
            },

            present_fwd: [25, 34, "present_still", 1.0],
            present_still: 34,
            present_back: {
                frames: range(29, 25),
                next: "idle",
                speed: 1.0,
            },

            look_left_fwd: [143, 145, "look_left_still", 1.0],
            look_left_still: 146,
            look_left_back: {
                frames: range(145, 143),
                next: "idle",
                speed: 1.0,
            },

            look_left: {
                frames: [0, 125, 126, 127, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 127, 126, 125, 0],
                next: "idle",
                speed: 1.0,
            },

            look_right: {
                frames: [0, 120, 121, 122, 123, 123, 123, 123, 123, 123, 123, 123, 123, 123, 123, 123, 123, 123, 123, 123, 123, 123, 122, 121, 120, 0],
                next: "idle",
                speed: 1.0,
            },

            look_down: {
                frames: [0, 110, 111, 112, 112, 112, 112, 112, 112, 112, 112, 112, 112, 112, 112, 112, 112, 113, 112, 112, 112, 113, 114, 0],
                next: "idle",
                speed: 1.0,
            },

            look_right_fwd: [149, 151, "look_right_still", 1.0],
            look_right_still: 152,
            look_right_back: {
                frames: range(151, 149),
                next: "idle",
                speed: 1.0,
            },

            lean_right_fwd: {
                frames: range(158, 156),
                next: "lean_right_still",
                speed: 1.0,
            },
            lean_right_still: 155,
            lean_right_back: [156, 158, "idle", 1.0],

            praise_fwd: [35, 44, "praise_still", 1.0],
            praise_still: 44,
            praise_back: {
                frames: range(39, 35),
                next: "idle",
                speed: 1.0,
            },

            grin_fwd: [743, 753, "grin_still", 1.0],
            grin_still: 747,
            grin_back: {
                frames: range(747, 743),
                next: "idle",
                speed: 1.0,
            },

            taptaptap: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },

            breathe: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },

            backflip: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },
        },

        logo_animations: {
            idle: 12,

            surf_across_fwd: [1, 8, "surf_across_still", 1.0],
            surf_across_still: 9,
            surf_across_back: {
                frames: range(8, 1),
                next: "idle",
                speed: 1.0,
            },

            clap_fwd: [10, 12, "clap_still", 1.0],
            clap_still: [13, 15, "clap_still", 1.0],
            clap_back: {
                frames: range(12, 10),
                next: "idle",
                speed: 1.0,
            },

            surf_intro: {
                frames: range(0, 71),
                next: "idle",
                speed: 1.5,
            },
            surf_away: {
                frames: range(12, 0),
                next: "gone",
                speed: 1.5,
            },

            gone: 259,

            shrug_fwd: [89, 91, "shrug_still", 1.0],
            shrug_still: 91,
            shrug_back: {
                frames: range(91, 89),
                next: "idle",
                speed: 1.0,
            },

            earth_fwd: [180, 210, "earth_still", 1.0],
            earth_still: [195, 210, "earth_still", 1.0],
            earth_back: {
                frames: range(211, 220),
                next: "idle",
                speed: 1.0,
            },

            cool: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },
            cool_peedy: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },
            taptaptap: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },

            breathe: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },

            backflip: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },
        },

        james_animations: {
            idle: 6,

            surf_across_fwd: [1, 8, "surf_across_still", 1.0],
            surf_across_still: 9,
            surf_across_back: {
                frames: range(8, 1),
                next: "idle",
                speed: 1.0,
            },

            clap_fwd: [65, 81, "clap_still", 0.6],
            clap_still: [70, 81, "clap_still", 0.6],
            clap_back: {
                frames: range(70, 65),
                next: "idle",
                speed: 0.6,
            },

            surf_intro: {
                frames: [851, 851, 514, 515, 516, 517, 518, 519, 520, 521, 522],
                next: "idle",
                speed: 0.6,
            },
            surf_away: {
                frames: [211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 225, 227, 229, 231, 237],
                next: "gone",
                speed: 0.6,
            },

            gone: 851,

            shrug_fwd: [89, 91, "shrug_still", 1.0],
            shrug_still: 91,
            shrug_back: {
                frames: range(91, 89),
                next: "idle",
                speed: 1.0,
            },

            earth_fwd: [180, 210, "earth_still", 1.0],
            earth_still: [195, 210, "earth_still", 1.0],
            earth_back: {
                frames: range(211, 220),
                next: "idle",
                speed: 1.0,
            },

            cool: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },
            cool_peedy: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },
            taptaptap: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },

            breathe: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },

            backflip: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },
        },

        mnature_animations: {
            idle: 0,

            surf_across_fwd: [1, 8, "surf_across_still", 1.0],
            surf_across_still: 9,
            surf_across_back: {
                frames: range(8, 1),
                next: "idle",
                speed: 1.0,
            },

            clap_fwd: [10, 12, "clap_still", 1.0],
            clap_still: [13, 15, "clap_still", 1.0],
            clap_back: {
                frames: range(12, 10),
                next: "idle",
                speed: 1.0,
            },

            surf_intro: {
                frames: [190, 189, 188, 16, 17, 18, 19, 18, 17, 18, 17, 18, 17, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 0],
                next: "idle",
                speed: 1.0,
            },
            surf_away: {
                frames: [0, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 17, 18, 19, 18, 17, 18, 17, 18, 17, 16, 188, 189, 190, 259],
                next: "gone",
                speed: 1.0,
            },

            gone: 259,

            shrug_fwd: [89, 91, "shrug_still", 1.0],
            shrug_still: 91,
            shrug_back: {
                frames: range(91, 89),
                next: "idle",
                speed: 1.0,
            },

            earth_fwd: [180, 210, "earth_still", 1.0],
            earth_still: [195, 210, "earth_still", 1.0],
            earth_back: {
                frames: range(211, 220),
                next: "idle",
                speed: 1.0,
            },

            cool: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },
            cool_peedy: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },
            taptaptap: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },

            breathe: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },

            backflip: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },
        },

        offcat_animations: {
            idle: 0,

            surf_across_fwd: [1, 8, "surf_across_still", 1.0],
            surf_across_still: 9,
            surf_across_back: {
                frames: range(8, 1),
                next: "idle",
                speed: 1.0,
            },

            clap_fwd: [10, 12, "clap_still", 1.0],
            clap_still: [13, 15, "clap_still", 1.0],
            clap_back: {
                frames: range(12, 10),
                next: "idle",
                speed: 1.0,
            },

            surf_intro: {
                frames: [72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 83, 85, 86, 87, 88, 89, 90, 91, 92, 0],
                next: "idle",
                speed: 1.0,
            },
            surf_away: {
                frames: [0, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225],
                next: "gone",
                speed: 1.0,
            },

            gone: 727,

            cool: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },
            cool_peedy: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },
            taptaptap: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },

            breathe: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },

            backflip: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },
        },

        f1_animations: {
            idle: 0,

            clap_fwd: [199, 218, "idle", 1.0],

            earth_fwd: [762, 786, "earth_still", 1.0],
            earth_still: [763, 786, "earth_still", 1.0],
            earth_back: {
                frames: [113, 0],
                next: "idle",
                speed: 1.0,
            },

            surf_intro: {
                frames: [4, 6, 7, 8, 9, 10, 112, 0],
                next: "idle",
                speed: 1.0,
            },
            surf_away: {
                frames: range(635, 675),
                next: "gone",
                speed: 1.0,
            },

            gone: 897,

            cool: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },
            cool_peedy: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },
            taptaptap: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },

            breathe: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },

            backflip: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },
        },
        rocky_animations: {
            idle: 0,

            surf_across_fwd: [1, 8, "surf_across_still", 1.0],
            surf_across_still: 9,
            surf_across_back: {
                frames: range(8, 1),
                next: "idle",
                speed: 1.0,
            },

            clap_fwd: [10, 12, "clap_still", 1.0],
            clap_still: [13, 15, "clap_still", 1.0],
            clap_back: {
                frames: range(12, 10),
                next: "idle",
                speed: 1.0,
            },

            surf_intro: {
                frames: [984, 984, 984, 984, 984, 984, 984, 984, 107, 108, 109, 110, 111, 112, 113, 114, 115],
                next: "idle",
                speed: 1.0,
            },
            surf_away: {
                frames: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236],
                next: "gone",
                speed: 1.0,
            },

            gone: 984,

            cool: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },
            cool_peedy: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },
            taptaptap: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },

            breathe: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },

            backflip: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },
        },
        rover_animations: {
            idle: 0,

            surf_across_fwd: [1, 8, "surf_across_still", 1.0],
            surf_across_still: 9,
            surf_across_back: {
                frames: range(8, 1),
                next: "idle",
                speed: 1.0,
            },

            clap_fwd: [291, 302, "clap_back", 1.0],
            clap_back: {
                frames: [292, 291, 0],
                next: "idle",
                speed: 1.0,
            },

            clicked: [230, 239, "idle", 1.0],
            sleep_fwd: {
                frames: [499, 500, 501, 502, 503, 504, 505, 506, 507, 508, 509, 515, 569, 570, 571, 572, 573, 574, 575, 576, 577],
                next: "sleep_still",
                speed: 1.0,
            },
            sleep_still: {
                frames: [577, 577, 577, 577, 577, 577, 577, 577, 577, 577, 578, 579, 580, 580, 580, 580, 580, 580, 580, 581, 582, 583, 577],
                next: "sleep_still",
                speed: 1.0,
            },
            sleep_back: {
                frames: [576, 572, 571, 569, 515, 508, 507, 505, 503, 502, 501],
                next: "idle",
                speed: 1.0,
            },
            surf_intro: {
                frames: [180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 0],
                next: "idle",
                speed: 1.0,
            },
            surf_away: {
                frames: [0, 303, 304, 305, 306, 307, 308, 309, 310, 311, 312, 313, 314, 315, 316, 317, 318, 319, 320, 321, 322, 323, 324, 325, 326, 327, 328, 329, 330, 331, 332, 333],
                next: "gone",
                speed: 1.0,
            },

            gone: 333,

            cool: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },
            cool_peedy: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },
            taptaptap: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },

            breathe: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },

            backflip: {
                frames: [0],
                next: "idle",
                speed: 1.0,
            },
        },
        blob_animations: {
            idle: 0,

            surf_across_fwd: [1, 8, "surf_across_still", 1.0],
            surf_across_still: 9,
            surf_across_back: {
                frames: range(8, 1),
                next: "idle",
                speed: 1.0,
            },

            clap_fwd: [38, 44, "clap_still", 1.0],
            clap_still: [45, 46, "clap_still", 1.0],
            clap_back: {
                frames: range(44, 38),
                next: "idle",
                speed: 1.0,
            },

            surf_intro: {
                frames: range(184, 167),
                next: "idle",
                speed: 1.0,
            },
            surf_away: {
                frames: range(167, 184),
                next: "gone",
                speed: 1.0,
            },

            gone: 461,

            hehehe: {
                frames: range(84, 102),
                next: "idle",
                speed: 1.0,
            },
            grin_fwd: [295, 302, "grin_still", 1.0],
            grin_still: 302,
            grin_back: {
                frames: range(302, 295),
                next: "idle",
                speed: 1.0,
            },
            shrug_fwd: [17, 22, "shrug_still", 1.0],
            shrug_still: 22,
            shrug_back: {
                frames: range(22, 17),
                next: "idle",
                speed: 1.0,
            },
            earth_fwd: [65, 77, "earth_still", 1.0],
            earth_still: [66, 77, "earth_still", 1.0],
            earth_back: {
                frames: range(77, 83),
                speed: 1.0,
                next: "idle",
            },
        },
        maxalert_animations: {
            idle: 0,

            shrug_fwd: [10, 17, "shrug_still", 1.0],
            shrug_still: 17,
            shrug_back: {
                frames: range(17, 10),
                next: "idle",
                speed: 1.0,
            },
            surf_across_fwd: [1, 8, "surf_across_still", 1.0],
            surf_across_still: 9,
            surf_across_back: {
                frames: range(8, 1),
                next: "idle",
                speed: 1.0,
            },

            clap_fwd: [38, 44, "clap_still", 1.0],
            clap_still: [45, 46, "clap_still", 1.0],
            clap_back: {
                frames: range(44, 38),
                next: "idle",
                speed: 1.0,
            },

            surf_intro: {
                frames: range(203, 225),
                next: "idle",
                speed: 1.0,
            },
            surf_away: {
                frames: range(103, 125),
                next: "gone",
                speed: 1.0,
            },

            gone: 125,

            grin_fwd: {
                frames: [285, 286, 288, 290, 292],
                next: "gone",
                speed: 1.0,
            },

            grin_still: 292,
            grin_back: {
                frames: [292, 290, 288, 286, 285],
                next: "idle",
                speed: 1.0,
            },
        },
    },
    to_idle: {
        //actually skips the animation upon joining. rlly bad
        //surf_intro: "idle",
        surf_away: "surf_intro",
        gone: "surf_intro",
        surf_across_fwd: "surf_across_back",
        surf_across_still: "surf_across_back",
        surprised_fwd: "surprised_back",
        surprised_still: "surprised_back",
        unbelievable_fwd: "unbelievable_back",
        unbelievable_still: "unbelievable_back",

        clap_fwd: "clap_back",
        clap_still: "clap_back",

        fact_fwd: "fact_back",
        fact_still: "fact_back",

        muted_fwd: "muted_back",
        muted_still: "muted_back",

        shrug_fwd: "shrug_back",
        shrug_still: "shrug_back",

        earth_fwd: "earth_back",
        earth_still: "earth_back",

        look_down_fwd: "look_down_back",
        look_down_still: "look_down_back",

        lean_left_fwd: "lean_left_back",
        lean_left_still: "lean_left_back",

        beat_fwd: "beat_back",
        beat_still: "beat_back",

        cool_fwd: "cool_back",
        cool_still: "cool_back",
        cool_adjust: "cool_back",

        cool_left_fwd: "cool_left_back",
        cool_left_still: "cool_left_back",

        present_fwd: "present_back",
        present_still: "present_back",

        sleep_fwd: "sleep_back",
        sleep_still: "sleep_back",

        look_left_fwd: "look_left_back",
        look_left_still: "look_left_back",

        look_right_fwd: "look_right_back",
        look_right_still: "look_right_back",

        lean_right_fwd: "lean_right_back",
        lean_right_still: "lean_right_back",

        praise_fwd: "praise_back",
        praise_still: "praise_back",

        grin_fwd: "grin_back",
        grin_still: "grin_back",

        backflip: "idle",

        breathe: "idle",
        taptaptap: "idle",

        look_left: "look_left_back",
        look_right: "look_right_back",
        look_down: "lean_right_back",
        cool: "cool_back",
        cool_peedy: "cool_back",

        idle: "idle",
    },
    pass_idle: ["gone"],
    event_list_joke_open: [
        [
            {
                type: "text",
                text: "Yeah, of course {NAME} wants me to tell a joke.",
            },
            {
                type: "anim",
                anim: "praise_fwd",
                ticks: 15,
            },
            {
                type: "text",
                text: '"HAHAHAHA LOOK AT THIS IDIOT NAMED {NAME} TELLING DAD JOKES!" That\'s not funny.',
                say: "HAHAHAHA LOOK AT THIS IDIOT NAMED {NAME} TELLING DAD JOKES! That's not funny.",
            },
            {
                type: "idle",
            },
            {
                type: "text",
                text: "But I'll do it anyway. Because you want me to. I hope you're happy. :|",
                say: "But I'll do it anyway. Because you want me to. I hope you're happy.",
            },
        ],
        [
            {
                type: "text",
                text: "OK {NAME}.",
                say: "OK, {NAME}.",
            },
        ],
        [
            {
                type: "text",
                text: "OK, I've got a good one for you.",
            },
        ],
        [
            {
                type: "text",
                text: "OK, here goes.",
            },
        ],
        [
            {
                type: "text",
                text: "Anything for you {NAME}.",
            },
        ],
        [
            {
                type: "text",
                text: "Sure, I've got a ton of them.",
            },
        ],
        [
            {
                type: "text",
                text: "Not a problem.",
            },
        ],
        [
            {
                type: "text",
                text: "{NAME}? I didn't know you liked my jokes so much.",
            },
        ],
        [
            {
                type: "text",
                text: "OK, if you're sure.",
            },
        ],
    ],
    event_list_joke_mid: [
        [
            {
                type: "text",
                text: "Why do they call HTML HyperText?",
            },
            {
                type: "text",
                text: "Too much Java!",
            },
        ],
        [
            {
                type: "text",
                text: 'Two sausages are in a pan. One looks at the other and says "Boy it\'s hot in here!" and the other sausage says "Unbelievable! It\'s a talking sausage!"',
                say: "Two sausages are in a pan. One looks at the other and says, Boy it's hot in here! and the other sausage says, Unbelievable! It's a talking sausage!",
            },
        ],
        [
            {
                type: "text",
                text: "What is in the middle of Paris?",
            },
            {
                type: "text",
                text: "A big, giant R.",
            },
        ],
        [
            {
                type: "text",
                text: "What did the digital clock say to the grandfather clock?",
            },
            {
                type: "text",
                text: "Tick tock.",
            },
        ],
        [
            {
                type: "text",
                text: "What do you call a man who shaves 10 times a day?",
            },
            {
                type: "text",
                text: "A skinless person.",
            },
        ],
        [
            {
                type: "text",
                text: "How do you get water in watermelons?",
            },
            {
                type: "text",
                text: "I don't know, ask Mother Nature.",
            },
        ],
        [
            {
                type: "text",
                text: "Why do we call money bread?",
            },
            {
                type: "text",
                text: "Because everyone <h3>kneads</h3> it.",
                say: "Because everyone kneads it. [[???????????]] that wasn't funny",
            },
        ],
    ],
    event_list_joke_end: [
        [
            {
                type: "text",
                text: "You know {NAME}, a good friend laughs at your jokes even when they're not so funny.",
            },
        ],
        [
            {
                type: "text",
                text: "Where do I come up with these?",
            },
        ],
        [
            {
                type: "text",
                text: "Do I amuse you, {NAME}? Am I funny? Do I make you laugh?",
            },
            {
                type: "text",
                text: "pls respond",
                say: "please respond",
            },
        ],
        [
            {
                type: "text",
                text: "Maybe I'll keep my day job, {NAME}. Patreon didn't accept me.",
            },
        ],
        [
            {
                type: "text",
                text: "Laughter is the best medicine!",
            },
            {
                type: "text",
                text: "Or not.",
            },
        ],
        [
            {
                type: "text",
                text: "Don't judge me on my sense of humor alone.",
            },
        ],
    ],

    // ============================================================================

    event_list_fact_open: [
        [
            {
                type: "html",
                text: "Hey kids, it's time for a Fun Fact&reg;!",
                say: "Hey kids, it's time for a Fun Fact!",
            },
            {
                type: "anim",
                anim: "fact_fwd",
                ticks: 45,
            },
        ],
    ],

    event_list_fact_mid: [
        [
            {
                type: "text",
                text: "Did you know that Uranus is 31,518 miles (50,724 km) in diameter?",
                say: "Did you know that Yer Anus is 31 thousand 500 and 18 miles in diameter?",
            },
            {
                type: "anim",
                anim: "fact_back",
                ticks: 15,
            },
            {
                type: "anim",
                anim: "grin_fwd",
                ticks: 15,
            },
        ],
        [
            {
                type: "text",
                text: "Fun Fact: The skript kiddie of this site didn't bother checking if the text that goes into the dialog box is HTML code.",
            },
            {
                type: "html",
                say: "<h3>HEY! IT LOOKS LIKE YOU'RE WRITING A LETTER! WOULD YOU LIKE SOME HELP?</h3>",
            },
            {
                type: "text",
                text: "This would soon be a horrible mistake of yours, Joey. Too many security vulnerabilities.",
            },
        ],
        [
            {
                type: "text",
                text: "Fun Fact: The skript kiddie- WAIT A MINUTE GUYS I THINK I KNOW WHERE THIS IS GOING",
            },
            {
                type: "text",
                text: "BAAAAAAAAAAAAAAAAAAAAAAAAAHHHHHHHHHHHHHHHHHH",
            },
        ],
        [
            {
                type: "text",
                text: "Fun Fact: Clippit is inside your walls.",
            },
            {
                type: "anim",
                anim: "grin_fwd",
                ticks: 15,
            },
        ],
        [
            {
                type: "text",
                text: "Many things that you've seen in the past years won't happen again. Such as the hijack hoaxes and other stupid stuff Siobhan used to do as a child.",
            },
            {
                type: "anim",
                anim: "fact_back",
                ticks: 15,
            },
            {
                type: "anim",
                anim: "grin_fwd",
                ticks: 15,
            },
        ],
        [
            {
                type: "text",
                text: "This app is unfinished, but if you want to suggest some cool things, feel free to ask Siobhan.",
            },
        ],
    ],

    event_list_fact_end: [
        [
            {
                type: "text",
                text: "o gee whilickers wasn't that sure interesting huh",
            },
        ],
        [
            {
                type: "idle",
            },
        ],
    ],
};

AgentData.event_list_joke = [
    {
        type: "add_random",
        pool: "event_list_joke_open",
        add: AgentData.event_list_joke_open,
    },
    {
        type: "anim",
        anim: "shrug_fwd",
        ticks: 15,
    },
    {
        type: "add_random",
        pool: "event_list_joke_mid",
        add: AgentData.event_list_joke_mid,
    },
    {
        type: "idle",
    },
    {
        type: "add_random",
        pool: "event_list_joke_end",
        add: AgentData.event_list_joke_end,
    },
    {
        type: "idle",
    },
];

AgentData.event_list_fact = [
    {
        type: "add_random",
        pool: "event_list_fact_open",
        add: AgentData.event_list_fact_open,
    },
    {
        type: "add_random",
        pool: "event_list_fact_mid",
        add: AgentData.event_list_fact_mid,
    },
    {
        type: "idle",
    },
    {
        type: "add_random",
        pool: "event_list_fact_end",
        add: AgentData.event_list_fact_end,
    },
    {
        type: "idle",
    },
];

AgentData.event_list_triggered = [
    {
        type: "anim",
        anim: "cool_fwd",
        ticks: 30,
    },
    {
        type: "idle",
    },
];

AgentData.event_list_linux = [
    {
        type: "text",
        text: "I'd just like to interject for a moment. What you're refering to as Linux, is in fact, GNU/Linux, or as I've recently taken to calling it, GNU plus Linux.",
    },
    {
        type: "text",
        text:
            "Linux is not an operating system unto itself, but rather another free component of a fully functioning GNU system made useful by the GNU corelibs, shell utilities and vital system components comprising a full OS as defined by POSIX.",
    },
    {
        type: "text",
        text:
            "Many computer users run a modified version of the GNU system every day, without realizing it. Through a peculiar turn of events, the version of GNU which is widely used today is often called Linux, and many of its users are not aware that it is basically the GNU system, developed by the GNU Project.",
    },
    {
        type: "text",
        text:
            "There really is a Linux, and these people are using it, but it is just a part of the system they use. Linux is the kernel: the program in the system that allocates the machine's resources to the other programs that you run. The kernel is an essential part of an operating system, but useless by itself; it can only function in the context of a complete operating system. Linux is normally used in combination with the GNU operating system: the whole system is basically GNU with Linux added, or GNU/Linux. All the so-called Linux distributions are really distributions of GNU/Linux.",
    },
];

AgentData.event_list_pawn = [
    {
        type: "text",
        text:
            "Hi, my name is {COLOR}, and this is my website. I annoy you when writing a letter. Everything in here has an ad and a fact. One thing I've learned after 28 years - you never know what is gonna eventually irritate you so much you uninstall Microsoft Office",
    },
];
AgentData.event_list_bees = [
    {
        type: "text",
        text: "According to all known laws",
    },
    {
        type: "text",
        text: "of aviation,",
    },
    {
        type: "text",
        text: "there is no way a bee",
    },
    {
        type: "text",
        text: "should be able to fly.",
    },
    {
        type: "text",
        text: "Nah, I'm not doing the whole thing.",
    },
];


$(document).ready(function () {
    window.onbeforeunload = function(event)
    {
        socket.emit("command",{list:["exit"]});
    };
    window.AgentHandler = new (function () {
        this.framerate = 1.0 / 15.0;

        this.spriteSheets = {};
        this.prepSprites = function () {
            var spriteColors = [
                "black",
                "blue",
                "brown",
                "green",
                "purple",
                "red",
                "pink",
                "yellow",
                "white",
                "cyan",
                "pope",
                "ban",
                "god",
                "king",
                "marisa",
                "reimu"
                /*
                "bonzi",
                "blessed",
                "bluestickman",
                "clippit",
                "genius",
                "blob",
                "genie",
                "robby",
                "f1",
                "james",
                "mnature",
                "merlin",
                "maxalert",
                "offcat",
                "rocky",
                "rover",
                "squidward",
                "undead",
                "peedy",
                "logo",
                "blank",
                "marisa",
                "reimu",
                "kern3l",
                "siobhan",
                "nono",
                "commo",
                "peetzuh",
                "squidward",
                "plankton",
				"kinito"
                */
            ];

            for (var i = 0; i < spriteColors.length; i++) {
                var color = spriteColors[i];
                var spriteData = {
                    images: ["./img/agents/" + color + ".png"],
                    frames:
                        color == "peedy"
                            ? AgentData.sprite.peedy_frames
                            : color == "merlin"
                            ? AgentData.sprite.merlin_frames
                            : color == "maxalert"
                            ? AgentData.sprite.maxalert_frames
                            : (color == "blob" || color == "genie")
                            ? AgentData.sprite.blob_frames
                            : color == "robby"
                            ? AgentData.sprite.merlin_frames
                            : color == "marisa"
                            ? AgentData.sprite.marisa_frames
                            : color == "reimu"
                            ? AgentData.sprite.reimu_frames
                            : (color == "clippit" || color == "logo" || color == "offcat" || color == "genius" || color == "f1" || color == "rocky")
                            ? AgentData.sprite.clippit_frames
							: (color == "rover")
                            ? AgentData.sprite.rover_frames
							: (color == "kinito")
                            ? AgentData.sprite.kinito_frames
                            : AgentData.sprite.frames,
                    animations: 
                        color == "peedy"
                            ? AgentData.sprite.peedy_animations
                            : color == "merlin"
                            ? AgentData.sprite.merlin_animations
                            : color == "maxalert"
                            ? AgentData.sprite.maxalert_animations
                            : color == "blob"
                            ? AgentData.sprite.blob_animations
                            : color == "genie"
                            ? AgentData.sprite.genie_animations
                            : color == "robby"
                            ? AgentData.sprite.robby_animations
                            : color == "marisa"
                            ? AgentData.sprite.marisa_animations
                            : color == "reimu"
                            ? AgentData.sprite.reimu_animations
                            : color == "clippit"
                            ? AgentData.sprite.clippit_animations
                            : color == "logo"
                            ? AgentData.sprite.logo_animations
                            : color == "offcat"
                            ? AgentData.sprite.offcat_animations
                            : color == "genius"
                            ? AgentData.sprite.genius_animations
                            : color == "f1"
                            ? AgentData.sprite.f1_animations
                            : color == "rocky"
                            ? AgentData.sprite.rocky_animations
                            : color == "kinito"
                            ? AgentData.sprite.kinito_animations
                            : (color == "kern3l" || color == "siobhan" || color == "commo" || color == "nono" || color == "plankton" || color == "squidward" || color == "peetzuh" || color == "bluestickman")
                            ? AgentData.sprite.template_animations
							: (color == "rover")
                            ? AgentData.sprite.rover_animations
							: (color == "bonzi")
                            ? AgentData.sprite.bonzi_animations
							: (color == "ban")
                            ? AgentData.sprite.ban_animations 
                            : AgentData.sprite.animations,
                };
                this.spriteSheets[color] = new createjs.SpriteSheet(spriteData);
            }
        };

        this.$canvas = $("#agent_canvas");
        this.$canvas.css("filter", `drop-shadow(20px -5px 4px rgba(0,0,0,0.2))`);

        this.stage = new createjs.StageGL(this.$canvas[0], { transparent: true });
        this.stage.tickOnUpdate = false;

        this.resizeCanvas = function () {
            var width = this.$canvas.width();
            var height = this.$canvas.height();
            this.$canvas.attr({
                width: this.$canvas.width(),
                height: this.$canvas.height(),
            });
            this.stage.updateViewport(width, height);
            this.needsUpdate = true;
            for (var i = 0; i < usersAmt; i++) {
                var key = usersKeys[i];
                agents[key].move();
            }
        };

        this.resizeCanvas();

        this.resize = function () {
            setTimeout(this.resizeCanvas.bind(this), 1);
        };

        this.needsUpdate = true;

        this.intervalHelper = setInterval(
            function () {
                this.needsUpdate = true;
            }.bind(this),
            1000
        );

        this.intervalTick = setInterval(
            function () {
                for (var i = 0; i < usersAmt; i++) {
                    var key = usersKeys[i];
                    agents[key].update();
                }
                this.stage.tick();
            }.bind(this),
            this.framerate * 1000
        );

        this.intervalMain = setInterval(
            function () {
                if (this.needsUpdate) {
                    this.stage.update();
                }
            }.bind(this),
            1
        );

        $(window).resize(this.resize.bind(this));

        this.agentsCheck = function () {
            $("#userListContent").html("");
            for (var i = 0; i < usersAmt; i++) {
                var key = usersKeys[i];
                if (!(key in agents)) {
                    agents[key] = new Agent(key, usersPublic[key]);
                    let msg = `${nmarkup(usersPublic[key].name)} has joined.`;
                    bonzilog("server", "", msg, null, msg, true);
                    if (agents[key].color.startsWith("http")) {
                        $("#userListContent").append(
                            `<div class="user-item"><img class="user-avatar" src="${agents[key].color}"><div class="user-name">${agents[key].userPublic.name}</div><div class="mic-${agents[key].id}" id='mic-indicator'></div></div></div>`
                        );
                    } else {
                        $("#userListContent").append(
                            `<div class="user-item"><img class="user-avatar" src="./favicons/user-icon.png"><div class="user-name">${agents[key].userPublic.name}</div><div class="mic-${agents[key].id}" id='mic-indicator'></div></div></div>`
                        );
                    }
                } else {
                    var b = agents[key];
                    b.userPublic = usersPublic[key];
                    b.updateName();
                    b.updateTag();
                    var newColor = usersPublic[key].color;
                    if (b.color != newColor) {
                        b.color = newColor;
                        b.updateSprite();
                    }
                    if (b.color.startsWith("http")) {
                        $("#userListContent").append(`<div class="user-item"><img class="user-avatar" src="${b.color}"><div class="user-name">${b.userPublic.name}</div><div class="mic-${b.id}" id='mic-indicator'></div></div></div>`);
                    } else {
                        $("#userListContent").append(
                            `<div class="user-item"><img class="user-avatar" src="./favicons/user-icon.png"><div class="user-name">${b.userPublic.name}</div><div class="mic-${b.id}" id='mic-indicator'></div></div></div>`
                        );
                    }
                }
            }
        };

        window.onpointermove = (e) => {
            if (dragged) {
                dragged.move(e.pageX - dragX, e.pageY - dragY);
            }
            if (chatLogDragged) {
                window.onresize();
                chat_log.style.width = `${e.pageX - dragX}px`;
            }
        };

        window.onpointerup = () => {
            dragged = null;
            chatLogDragged = false;
        };
        $("#btn_tile").click(function () {
            var winWidth = $(window).width();
            var winHeight = $(window).height();
            var minY = 0;
            var addY = 80;
            var x = 0,
                y = 0;
            for (var i = 0; i < usersAmt; i++) {
                var key = usersKeys[i];
                agents[key].move(x, y);

                x += 200;
                if (x + 100 > winWidth) {
                    x = 0;
                    y += 160;
                    if (y + 160 > winHeight) {
                        minY += addY;
                        addY /= 2;
                        y = minY;
                    }
                }
            }
        });
        return this;
    })();
});

function range(begin, end) {
    var array = [];
    for (var i = begin; i <= end; i++) array.push(i);
    for (var i = begin; i >= end; i--) array.push(i);
    return array;
}

function replaceAll(t, s, r) {
    return t.replace(new RegExp(s, "g"), r);
}

function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
}

// http://stackoverflow.com/a/8260383/2605226
function youtubeParser(url) {
    var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
    var match = url.match(regExp);
    return match && match[7].length == 11 ? match[7] : false;
}

// http://codereview.stackexchange.com/q/47889
function rtimeOut(callback, delay) {
    var dateNow = Date.now,
        requestAnimation = window.requestAnimationFrame,
        start = dateNow(),
        stop,
        timeoutFunc = function () {
            dateNow() - start < delay ? stop || requestAnimation(timeoutFunc) : callback();
        };
    requestAnimation(timeoutFunc);
    return {
        clear: function () {
            stop = 1;
        },
    };
}

function rInterval(callback, delay) {
    var dateNow = Date.now,
        requestAnimation = window.requestAnimationFrame,
        start = dateNow(),
        stop,
        intervalFunc = function () {
            dateNow() - start < delay || ((start += delay), callback());
            stop || requestAnimation(intervalFunc);
        };
    requestAnimation(intervalFunc);
    return {
        clear: function () {
            stop = 1;
        },
    };
}

// http://stackoverflow.com/a/14853974/2605226
// Warn if overriding existing method
if (Array.prototype.equals) console.warn("Overriding existing Array.prototype.equals. Possible causes: New API defines the method, there's a framework conflict or you've got double inclusions in your code.");
// attach the .equals method to Array's prototype to call it on any array
Array.prototype.equals = function (array) {
    // if the other array is a falsy value, return
    if (!array) return false;

    // compare lengths - can save a lot of time
    if (this.length != array.length) return false;

    for (var i = 0, l = this.length; i < l; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!this[i].equals(array[i])) return false;
        } else if (this[i] != array[i]) {
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;
        }
    }
    return true;
};

// Hide method from for-in loops
Object.defineProperty(Array.prototype, "equals", { enumerable: false });

// http://stackoverflow.com/a/14333691/2605226
function linkify(text) {
    var regex = /(https?:\/\/([-\w\.]+)+(:\d+)?(\/([\w\/_\.]*(\?\S+)?)?)?)/gi;
    return text.replace(regex, "I'M TRYING TO BE A HOG FOR MEMBERS BUT I'M ACTUALLY DESPERATE FOR ATTENTION LMAO");
}

var loadQueue = new createjs.LoadQueue();
var loadDone = [];
var loadNeeded = [
    "agentBlack",
    "agentBlue",
    "agentBrown",
    "agentGreen",
    "agentPurple",
    "agentRed",
    "agentPink",
    "agentCyan",
    "agentYellow",
    "agentUndead",

    "clippit",
    "f1",
    "genius",
    "logo",
    "merlin",
    "mnature",
    "offcat",
    "robby",
    "merlin",
    "genie",
    "rocky",
    "peedy",
    "bonzi",
    "rover",
    "blob",
    "maxalert",
    "james",

    "topjej",
];
$(window).load(function () {
    $("#login_load").hide();
    $("#login_card").fadeIn(150);

    loadAgents();
});

function loadAgents(callback) {
    loadQueue.loadManifest([
        { id: "agentBlack", src: "./img/agents/black.png" },
        { id: "agentBlue", src: "./img/agents/blue.png" },
        { id: "agentBrown", src: "./img/agents/brown.png" },
        { id: "agentGreen", src: "./img/agents/green.png" },
        { id: "agentPurple", src: "./img/agents/purple.png" },
        { id: "agentRed", src: "./img/agents/red.png" },
        { id: "agentPink", src: "./img/agents/pink.png" },
        { id: "clippit", src: "./img/agents/clippit.png" },
        { id: "f1", src: "./img/agents/f1.png" },
        { id: "genius", src: "./img/agents/genius.png" },
        { id: "logo", src: "./img/agents/logo.png" },
        { id: "merlin", src: "./img/agents/merlin.png" },
        { id: "mnature", src: "./img/agents/mnature.png" },
        { id: "offcat", src: "./img/agents/offcat.png" },
        { id: "robby", src: "./img/agents/robby.png" },
        { id: "merlin", src: "./img/agents/merlin.png" },
        { id: "genie", src: "./img/agents/genie.png" },
        { id: "rocky", src: "./img/agents/rocky.png" },
        { id: "peedy", src: "./img/agents/peedy.png" },
        { id: "bonzi", src: "./img/agents/bonzi.png" },
        { id: "rover", src: "./img/agents/rover.png" },
        { id: "blob", src: "./img/agents/blob.png" },
        { id: "maxalert", src: "./img/agents/maxalert.png" },
        { id: "james", src: "./img/agents/james.png" },
    ]);
    loadQueue.on(
        "fileload",
        function (e) {
            loadDone.push(e.item.id);
        },
        this
    );
    if (callback) loadQueue.on("complete", callback, this);
}
// http://stackoverflow.com/a/26118970
var undefined;
var hostname = isApp ? "bonkey.world" : window.location.hostname;

var socket = io("https://bonzl.world",{
    transports: ["websocket"],
});
var authlevel = 0;
var usersPublic = {};
var agents = {};

var debug = true;

function loadTest() {
    $("#login_card").hide();
    $("#login_error").hide();
    $("#login_load").show();

    login();
}

function login() {
    socket.emit("login", {
        name: $("#login_name").val(),
        room: $("#login_room").val(),
        color: localStorage.color || "",
    });
    localStorage.name = $("#login_name").val();
    localStorage.room = $("#login_room").val();
    socket.emit("command", { list: ["pitch", localStorage.pitch] });
    socket.emit("command", { list: ["speed", localStorage.speed] });
    socket.emit("command", { list: ["techy", localStorage.techy_code] });
    socket.emit("command", { list: ["mod_code", localStorage.mod_code] });
    socket.emit("command", { list: ["bonzitv_code", localStorage.bonzitv_code] });
    socket.emit("command", { list: ["dev_code", localStorage.dev_code] });
    socket.emit("command", { list: ["tag", localStorage.tag] });
    socket.emit("command", { list: ["voice", localStorage.voice] });
    $("#page_login").fadeOut(150);
    setup();
}

$(function () {
    $("#login_go").click(loadTest);

    $("#login_room").val(window.location.hash.slice(1));

    $("#login_name, #login_room").keypress(function (e) {
        if (e.which == 13) login();
    });

    socket.on("ban", function (data) {
        $("#page_ban").show();
        $("#ban_reason").html(data.reason);
        $("#ban_end").html(new Date(data.end).toString());
    });

    socket.on("disconnect", function (data) {
        errorFatal()
    });

    socket.on("kick", function (data) {
        $("#page_kick").show();
        $("#kick_reason").html(data.reason);
    });

    socket.on("loginFail", function (data) {
        var errorText = {
            nameLength: "Name too long.",
            full: "Room is full.",
            nameMal: "Nice try. Why would anyone join a room named that anyway?",
            toomuch: "You have too many users assigned to your IP. Close some tabs.",
        };
        $("#login_card").show();
        $("#login_load").hide();
        $("#login_error")
            .show()
            .text("Error: " + errorText[data.reason] + " (" + data.reason + ")");
    });
});

function errorFatal() {
    if ($("#page_ban").css("display") == "none" || $("#page_kick").css("display") == "none") {
        $("#page_error").show();
        var audio = new Audio("classic-failure-trumpet.wav");
        audio.play();
    }
}

const sfx = {
    shoot: new Audio("../sfx/shoot.wav"),
    explode: new Audio("../sfx/explode.wav"),
    evilLaugh: new Audio("../sfx/evil_laugh.wav"),
    spellStart: new Audio("../sfx/spell_start.wav"),
    banThrow: new Audio("../sfx/banhammer_throw.wav"),
    bounce: new Audio("../sfx/boing.wav")
};

function startBanhammerMode() {
    let bossHP = 500;
    let spellCardActive = false;
    const bullets = [];
    const canvas = document.createElement("canvas");
    canvas.id = "banhammer-canvas";
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        pointer-events: none;
        z-index: 9999;
    `;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    const evilImg = new Image();
    evilImg.src = "../img/evil.png";

    const hammerImg = new Image();
    hammerImg.src = "../img/banhammer.png";

    const explosionImg = new Image();
    explosionImg.src = "../img/explosion.png"; // Make sure this exists

    const hammers = [];
    let evilX = canvas.width / 2 - 128;
    let evilY = 0;
    let evilDir = 3;

    evilBonziSpeak("i'm going to ban you all! hahahahahahaha!")
    function spawnHammers() {
        for (let i = 0; i < 3; i++) {
            hammers.push({
                x: evilX + 128 + (Math.random() * 80 - 40),
                y: evilY + 180,
                speed: 5 + Math.random() * 4,
                size: 64,
                angle: Math.random() * Math.PI * 2,
                spin: (Math.random() * 0.1 + 0.05) * (Math.random() < 0.5 ? 1 : -1)
            });
            sfx.banThrow.currentTime = 0;
            sfx.banThrow.volume = 0.1;
            sfx.banThrow.play();
        }
    }

    const spawnInterval = setInterval(spawnHammers, 400);

    function update() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Move evil bonzi
        evilX += evilDir;
        if (evilX < 0 || evilX > canvas.width - 256) evilDir *= -1;
        ctx.drawImage(evilImg, evilX, evilY, 256, 256);

        const agent = agents?.[bonzi_guid];
        if (!agent) return requestAnimationFrame(update);

        for (let i = hammers.length - 1; i >= 0; i--) {
            const h = hammers[i];
            h.y += h.speed;
            h.angle += h.spin;

            ctx.save();
            ctx.translate(h.x + h.size / 2, h.y + h.size / 2);
            ctx.rotate(h.angle);
            ctx.drawImage(hammerImg, -h.size / 2, -h.size / 2, h.size, h.size);
            ctx.restore();

            // Collision
            const ax = agent.x;
            const ay = agent.y;
            const aw = 200;
            const ah = 160;

            const hit = h.x + h.size > ax && h.x < ax + aw && h.y + h.size > ay && h.y < ay + ah;
            if (hit) {
                // 💥 Explosion
                if (!agent._hasExploded) {
                    agent._hasExploded = true;
                    sfx.explode.play();
                    socket.emit("banhammer_hit",bonzi_guid);
                    setTimeout(function(){
                        agent._hasExploded = false;
                    },5000)
                }
            }

            if (h.y > canvas.height + 100) hammers.splice(i, 1);
        }

        // Bullet update + boss collision
        for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];
            b.y -= b.speed;

            // Draw bullet
            ctx.fillStyle = "cyan";
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.size / 2, 0, Math.PI * 2);
            ctx.fill();

            // Boss collision
            if (
                b.x > evilX && b.x < evilX + 256 &&
                b.y > evilY && b.y < evilY + 256 &&
                !spellCardActive
            ) {
                bullets.splice(i, 1);
                bossHP--;

                if (bossHP <= 0 && !spellCardActive) {
                    spellCardActive = true;
                    startSpellCard();
                }

                continue;
            }

            // Out of bounds
            if (b.y < -20) bullets.splice(i, 1);
        }
        requestAnimationFrame(update);
    }
    function startSpellCard() {
        clearInterval(spawnInterval);
        ctx.drawImage(evilImg, evilX, evilY, 256, 256);
        canvas.remove();
        evilBonziSpeak("no! no! no! grrrrrrrrrrrrrrrrrrrrrrr!")
        socket.emit("evilbonzikilled",bonzi_guid)
    }
    let loaded = 0;
    [evilImg, hammerImg, explosionImg].forEach(img => {
        img.onload = () => {
            loaded++;
            if (loaded === 3) update();
        };
    });

    document.addEventListener("keydown", (e) => {
        if (e.code === "Space") {
            socket.emit("bulletshoot");
            sfx.shoot.currentTime = 0;
            sfx.shoot.play();
        }
    });
    socket.on("agent_bullet", (data) => {
        const agent = agents[data.id];
        if (!agent) return;

        bullets.push({
            x: agent.x + 100,
            y: agent.y,
            speed: 8,
            size: 16,
            id: data.id
        });
            sfx.shoot.currentTime = 0;
            sfx.shoot.play();
    });
    socket.on("explode", (data) => {
        const agent = agents[data]
        if (!agent) return;
                    agent._hasExploded = true;
                    sfx.explode.play();
                    agent.explode();
        evilBonziSpeak("hahahahahahaha!")
    });
}


var localAgent = null;
function hideUI() {
    $("#top_bar").hide();
    $("#sub_top_bar").hide();
}
function setup() {
    $.contextMenu({
		selector: "#content",
		build: function (ignoredTrigger, ignoredEvent) {
			return {
                items: {
                    espeak: {
                        name: () => (espeaktts ? "Enable eSpeak" : "Disable eSpeak"),
                        callback: function () { espeaktts = !espeaktts; }
                    }
                }
            }
        },
		animation: { duration: 175, show: "fadeIn", hide: "fadeOut" },
	});
    socket.on("connect", () => {
        setTimeout(() => {
            if (joined) {
                socket.emit("login", {
                    name: $("#login_name").val(),
                    room: $("#login_room").val(),
                    color: localStorage.color || "",
                });
            }
        }, 500);
    });
	
    socket.on("balanceUpdate", balance => {
      $(".coin_count").text(balance)
    });

    socket.on("earned", amount => {
        let msg = `<font color="green">You earned ${amount} BonziCOINs! <img src="bonzicoin.png" width=16></font>`;
        bonzilog("server", "", msg, null, msg, true);
    });

    socket.on("errorMessage", msg => {
      alert(msg);
    });

		socket.on("typing", function (data) {
			var b = agents[data.guid];
			b.typing(true)
		}); 
		socket.on("stoptyping", function (data) {
			var b = agents[data.guid];
			b.typing(false)
		});
    $("#games_button").click(function () {
        new Dialog({
            title: "Games",
            class: "flex_window",
            html: `<iframe src="../games.html" style="width: 100%; height: 100%;"></iframe>`,
            x: 400,
            y: 200,
            width: 960,
            height: 600,
        });
    });
    $("#chat_send").click(sendInput);
    $("#voiceChatButton").click(function () {
        voiceChatEnabled = !voiceChatEnabled;
        if (voiceChatEnabled == true) {
            navigator.mediaDevices
                .getUserMedia({ audio: true, video: false })
                .then((stream) => {
                    var madiaRecorder = new MediaRecorder(stream);
                    var audioChunks = [];

                    madiaRecorder.addEventListener("dataavailable", function (event) {
                        audioChunks.push(event.data);
                    });

                    madiaRecorder.addEventListener("stop", function () {
                        var audioBlob = new Blob(audioChunks);
                        audioChunks = [];
                        var fileReader = new FileReader();
                        fileReader.readAsDataURL(audioBlob);
                        fileReader.onloadend = function () {
                            var base64String = fileReader.result;
                            if (voiceChatEnabled) {
                                socket.emit("audioStream", {
                                    audio: base64String,
                                });
                            }
                        };

                        madiaRecorder.start();
                        setTimeout(function () {
                            madiaRecorder.stop();
                        }, 2500);
                    });

                    madiaRecorder.start();
                    setTimeout(function () {
                        madiaRecorder.stop();
                    }, 2500);
                })
                .catch((error) => {
                    console.error("Error capturing audio.", error);
                });
        }
    });
    $("#chat_message").keypress(function (e) {
        if (e.which == 13) sendInput();
    });

	$("#chat_message").keydown(function (key) {
		if (key.which == 13) {
			typing = false;
			socket.emit("command", { list: ["stoptyping"] });
			clearTimeout(typingTimeout);
			return;
		}
		if (!typing) {
			socket.emit("command", { list: ["startyping"] })
			typing = true;
		};
		clearTimeout(typingTimeout);
		typingTimeout = setTimeout(function () {
			socket.emit("command", { list: ["stoptyping"] });
			typing = false;
		}, 2000);
	});
    socket.on("audioStream", (data) => {
        var b = agents[data.guid];
        if (b.voiceChat == false) {
            var newData = data.audio.split(";");
            newData[0] = "data:audio/ogg;";
            newData = newData[0] + newData[1];

            var audio = new Audio(newData);
            if (!audio || document.hidden) {
                return;
            }
            audio.play();

            const indicator = document.getElementById(`mic-${data.id}`);
            if (indicator) {
                indicator.className = `mic-indicator active`;
            }
            b.voiceChat = true;
            audio.onended = function () {
                b.voiceChat = false;
            };
        }
    });

    socket.on("joke", function (data) {
        var b = agents[data.guid];
        if (b.mute) return;
        b.rng = new Math.seedrandom(data.rng);
        b.cancel();
        b.joke();
    });

    socket.on("youtube", function (data) {
        var b = agents[data.guid];
        if (b.mute) return;
        b.cancel();
        b.youtube(data.vid);
    });

    socket.on("fact", function (data) {
        var b = agents[data.guid];
        if (b.mute) return;
        b.rng = new Math.seedrandom(data.rng);
        b.cancel();
        b.fact();
    });

    socket.on("backflip", function (data) {
        var b = agents[data.guid];
        if (b.mute) return;
        b.cancel();
        b.backflip(data.swag);
    });

    socket.on("asshole", function (a) {
        var b = agents[a.guid];
        b.cancel(), b.asshole(a.target.replaceAll("{NAME}","(NAME)").replaceAll("{COLOR}","(COLOR)"));
    });
    socket.on("move", function (a) {
        var b = agents[a.guid];
        b.move(a.posX,a.posY);
    });
    socket.on("look", function (a) {
        var b = agents[a.guid];
        b.$canvas.css("transform",`rotate(${a.deg}deg)`)
    });
    socket.on("size", function (a) {
        var b = agents[a.guid];
        b.$canvas.css("transform", `scale(${a.size})`);
    });
    socket.on("owo", function (a) {
        var b = agents[a.guid];
        b.cancel(), b.owo(a.target.replaceAll("{NAME}","(NAME)").replaceAll("{COLOR}","(COLOR)"));
    });
    socket.on("triggered", function (data) {
        var b = agents[data.guid];
        if (b.mute) return;
        b.cancel();
        b.runSingleEvent(b.data.event_list_triggered);
    });

    socket.on("linux", function (data) {
        var b = agents[data.guid];
        if (b.mute) return;
        b.cancel();
        b.runSingleEvent(b.data.event_list_linux);
    });

    socket.on("pawn", function (data) {
        var b = agents[data.guid];
        if (b.mute) return;
        b.cancel();
        b.runSingleEvent(b.data.event_list_pawn);
    });

    socket.on("anim", function (data) {
        var b = agents[data.guid];
        b.stopSpeaking();
        b.runSingleEvent([
            {
                type: "anim",
                anim: data.anim,
                ticks: 10,
            },
        ]);
    });

    socket.on("replaceTVWithURL", function (a) {
        $("#bonzi_tv").html("<div id='bonzi_tv_player' style='position: absolute; overflow: hidden; width: 100%; height: 100%; pointer-events: none;'></div>");

        function onPlayerReady(event) {
            event.target.setVolume(100);
            event.target.playVideo();
        }
        if (a.hourAmount == 23 || (a.hourAmount == 22 && a.minuteAmount >= 9)) {
            var youtube = new YT.Player("bonzi_tv_player", {
                height: "100%",
                width: "100%",
                videoId: "kQsoV69uGIY",
                host: `${window.location.protocol}//www.youtube.com`,
                playerVars: {
                    autoplay: 1,
                    modestbranding: 1,
                    controls: 1,
                    showinfo: 1,
                    loop: 1,
                },
                events: {
                    onReady: onPlayerReady,
                    onStateChange: function (event) {
                        // -1 - unstarted
                        // 0 - ended
                        // 1 - playing
                        // 2 - paused
                        // 3 - buffering
                        // 5 - video cued
                        switch (event.data) {
                            case 0:
                                // Ended

                                $("#bonzi_tv").html("<div id='bonzi_tv_player' style='position: absolute; overflow: hidden; width: 100%; height: 100%; pointer-events: none;'></div>");
                                var youtube = new YT.Player("bonzi_tv_player", {
                                    height: "100%",
                                    width: "100%",
                                    videoId: "kQsoV69uGIY",
                                    host: `${window.location.protocol}//www.youtube.com`,
                                    playerVars: {
                                        autoplay: 1,
                                        modestbranding: 1,
                                        controls: 1,
                                        showinfo: 1,
                                    },
                                    events: {
                                        onStateChange: function (event) {
                                            // -1 - unstarted
                                            // 0 - ended
                                            // 1 - playing
                                            // 2 - paused
                                            // 3 - buffering
                                            // 5 - video cued
                                            switch (event.data) {
                                                case 0:
                                                    // Ended
                                                    socket.emit("updatebonzitv");
                                                    break;
                                            }
                                        },
                                    },
                                });
                                break;
                        }
                    },
                },
            });
        } else {
            var youtube = new YT.Player("bonzi_tv_player", {
                height: "100%",
                width: "100%",
                videoId: a.identId,
                host: `${window.location.protocol}//www.youtube.com`,
                playerVars: {
                    autoplay: 1,
                    modestbranding: 1,
                    controls: 1,
                    showinfo: 1,
                },
                events: {
                    onReady: onPlayerReady,
                    onStateChange: function (event) {
                        // -1 - unstarted
                        // 0 - ended
                        // 1 - playing
                        // 2 - paused
                        // 3 - buffering
                        // 5 - video cued
                        switch (event.data) {
                            case 0:
                                // Ended

                                $("#bonzi_tv").html("<div id='bonzi_tv_player' style='position: absolute; overflow: hidden; width: 100%; height: 100%; pointer-events: none;'></div>");
                                var youtube = new YT.Player("bonzi_tv_player", {
                                    height: "100%",
                                    width: "100%",
                                    videoId: a.id,
                                    host: `${window.location.protocol}//www.youtube.com`,
                                    playerVars: {
                                        autoplay: 1,
                                        modestbranding: 1,
                                        controls: 1,
                                        showinfo: 1,
                                    },
                                    events: {
                                        onReady: onPlayerReady,
                                        onStateChange: function (event) {
                                            // -1 - unstarted
                                            // 0 - ended
                                            // 1 - playing
                                            // 2 - paused
                                            // 3 - buffering
                                            // 5 - video cued
                                            switch (event.data) {
                                                case 0:
                                                    // Ended
                                                    socket.emit("updatebonzitv");
                                                    break;
                                                case 1: {
                                                    updateCurrentTime = setInterval(function () {
                                                        socket.emit("setbonzitvtime", {
                                                            curtime: youtube.playerInfo.currentTime,
                                                        });
                                                        console.log(youtube.playerInfo.currentTime);
                                                    }, 5000);
                                                }
                                            }
                                        },
                                    },
                                });
                                break;
                        }
                    },
                },
            });
            clearInterval(updateCurrentTime);
        }
    }),
        socket.on("room", function (data) {
            $("#page_error").hide();
            $("#room_owner")[data.isOwner ? "show" : "hide"]();
            $("#room_public")[data.isPublic ? "show" : "hide"]();
            $("#room_private")[!data.isPublic ? "show" : "hide"]();
            $(".room_id").text(data.room);
            $(".room-name").text(data.room);
            if (data.vid != "") {
                $("#bonzi_tv").html(
                    "<div id='bonzi_tv_player' style='position: absolute; overflow: hidden; width: 100%; height: 100%; pointer-events: none; background-image:url('/img/desktop/logo.tv.png'), url('/img/desktop/bg.png');'></div>"
                );
                theme(
                    '#bonzi_tv {background-image:url("/img/desktop/logo.tv.png"); background-repeat: no-repeat; background-position: top-left} #bonzi_canvas {background-image:url("/img/desktop/logo.tv.png"); background-repeat: no-repeat; background-position: top-left}'
                );
                function onPlayerReady(event) {
                    if (window.location.hostname == "localhost") {
                        event.target.setVolume(0);
                        event.target.playVideo();
                    } else {
                        event.target.setVolume(100);
                        event.target.playVideo();
                    }
                }
                var youtube = new YT.Player("bonzi_tv_player", {
                    height: "100%",
                    width: "100%",
                    videoId: data.vid,
                    host: `${window.location.protocol}//www.youtube.com`,
                    playerVars: {
                        start: data.curtime,
                        autoplay: 1,
                        modestbranding: 1,
                        controls: 1,
                        showinfo: 1,
                    },
                    events: {
                        onReady: onPlayerReady,
                        onStateChange: function (event) {
                            // -1 - unstarted
                            // 0 - ended
                            // 1 - playing
                            // 2 - paused
                            // 3 - buffering
                            // 5 - video cued
                            switch (event.data) {
                                case 0:
                                    // Ended
                                    socket.emit("updatebonzitv");
                                    break;
                                case 1: {
                                    updateCurrentTime = setInterval(function () {
                                        socket.emit("setbonzitvtime", {
                                            curtime: youtube.playerInfo.currentTime,
                                        });
                                        console.log(youtube.playerInfo.currentTime);
                                    }, 5000);
                                    break;
                                }
                            }
                        },
                    },
                });
                $("#bonzi_canvas").click(function () {
                    youtube.play();
                });
            }
        });

    socket.on("topic", function (data) {
        $("#room_info").html("<h1>Topic - " + data.topic + "</h1>");
    });

    socket.on("rooms", function (data) {
        new Dialog({
            title: "Room Count",
            html: `<p>There are currently <strong>${data.count}</strong> active rooms.</p>`,
            x: Math.floor(Math.random() * 500),
            y: Math.floor(Math.random() * 300),
            width: 300,
            height: 150,
        });
    });

    socket.on("updateGuid", function (data) {
        window.bonzi_guid = data.guid;
            
        localAgent = agents[bonzi_guid];
        socket.on("state_banhammer", () => {
            startBanhammerMode();
                    
            new Dialog({
                title: "OH NO!!!",
                class: "flex_window",
                html: `
                    <div class="blessed_body">
                        <h1>Oh noes! Evil Bonzi is here!</h1>
                        Press your spacebar to shoot bullets. make sure you move around your bonzi or you will die! D:
                    </div>
                `,
                x: 300,
                y: 400,
                width: 600,
                height: 400,
            })
        });
        
        socket.on("banhammer_death", () => {
            localAgent.run = false; 
            //$(localAgent.selElement).css("transition", "all 0.5s ease").css("transform", "translateY(-1000px)");
        });

        socket.on("banhammer_respawn", () => {
            //$(localAgent.selElement).css("transition", "").css("transform", "");
            localAgent.run = true;
        });
    });
    
    socket.on("updateAll", function (data) {
        usersPublic = data.usersPublic;
        usersUpdate();
        AgentHandler.agentsCheck();
    });

    socket.on("update", function (data) {
        window.usersPublic[data.guid] = data.userPublic;
        usersUpdate();
        AgentHandler.agentsCheck();
    });
    socket.on("youtube", function (data) {
        var b = agents[data.guid];
        if (b.mute) return;
        b.cancel();
        b.youtube(data.vid);
    });

    socket.on("video", function (data) {
        var b = agents[data.guid];
        if (b.mute) return;
        b.cancel();
        b.video(data.vid);
    });

    socket.on("video_flash", function (data) {
        var b = agents[data.guid];
        if (b.mute) return;
        b.cancel();
        b.video_flash(data.vid);
    });

    socket.on("img", function (data) {
        var b = agents[data.guid];
        if (b.mute) return;
        b.cancel();
        b.img(data.vid);
    });

    socket.on("background", function (data) {
        if (data.url) {
            $("#content").css("background-image", `url(${data.url})`);
        } else {
            $("#content").css("background-image", `none`);
            $("#content").css("background", "linear-gradient(135deg, #1a1a1a, #4a4a4a)");
        }
    });
    socket.on("authlevel", function (a) {
        authlevel = a.level;
        console.log(a.level);
    });

    socket.on("linux", function (data) {
        var b = agents[data.guid];
        if (b.mute) return;
        b.cancel();
        b.runSingleEvent(b.data.event_list_linux);
    });

    socket.on("pawn", function (data) {
        var b = agents[data.guid];
        if (b.mute) return;
        b.cancel();
        b.runSingleEvent(b.data.event_list_pawn);
    });

    socket.on("bees", function (data) {
        var b = agents[data.guid];
        if (b.mute) return;
        b.cancel();
        b.runSingleEvent(b.data.event_list_bees);
    });

    socket.on("talk", function (data) {
        var b = agents[data.guid];
        if (b.mute) return;
        b.cancel();
        b.runSingleEvent([
            {
                type: "text",
                text: data.text.replaceAll("{NAME}","(NAME)").replaceAll("{COLOR}","(COLOR)"),
            },
        ]);
    });

    socket.on("leave", function (data) {
        var b = agents[data.guid];
        if (!b.leaving) {

            if (typeof b != "undefined") {
                let msg = `${nmarkup(b.userPublic.name)} has left.`;
                bonzilog("server", "", msg, null, msg, false);
                if (b.userPublic.roblox) {
                    let rot = 0;
                    let x = this.x;
                    let y = this.y;
                    let xx = 0;
                    let yy = 0;
                    let angvel = Math.random() * 30 + 20;
                    if (Math.random() > 0.5) angvel *= -1;
                    let xvel = Math.random() * 10 + 5;
                    if (Math.random() > 0.5) xvel *= -1;
                    let yvel = -20;
                    let i = 0;
                    var audio = new Audio("./uuhhh.wav");
                    audio.play();
                    audio.playbackRate = this.playbackRate || 1;
                    audio.preservesPitch = false;
                    let interval = setInterval(() => {
                        i++;
                        yvel += 2;
                        rot += angvel;
                        x += xvel;
                        y += yvel;
                        xx += xvel;
                        yy += yvel;
                        b.element.style.transform = `translate(${xx}px, ${yy}px) rotate(${rot}deg)`;
                        b.sprite.x = x + b.overlayOffset.left;
                        b.sprite.y = y + b.overlayOffset.top;
                        b.sprite.rotation = rot;
                        if (i > 120) {
                            clearInterval(interval);
                            b.deconstruct();
                            delete agents[data.guid];
                            delete usersPublic[data.guid];
                            usersUpdate();
                        }
                        AgentHandler.needsUpdate = true;
                    }, 33);
                } else {

                    b.exit(
                        function (data) {
                            if (this.sprite.currentAnimation == "gone") {
                                this.deconstruct();
                                delete agents[data.guid];
                                delete usersPublic[data.guid];
                                usersUpdate();
                            } else if (this.sprite.currentAnimation != "surf_away" && this.sprite.currentAnimation != "surf_away2" && this.sprite.currentAnimation != "gone") {
                                this.sprite.gotoAndPlay("surf_away");
                            }
                        }.bind(b, data)
                    );
                    
                }
            }
            b.leaving = true;
        }
    });

    socket.emit("command", { list: ["dialogueended"] });

    socket.on("inflate", () => {
        // No seriously why does this even exist
        const originalScale = {};
        const originalPitch = {};
        for (const id in agents) {
            const agent = agents[id];
            if (!agent || !agent.sprite) continue;

            if (agent.goingToSpeak) {
                // Save original scale and pitch
                originalScale[id] = { x: 1, y: 1 };
                originalPitch[id] = 1;
                // Enlarge the agent
                agent.sprite.scaleX *= 1.05;
                agent.sprite.scaleY *= 1.05;
                agent.$canvas.css("transform", `scale(${agent.sprite.scaleX})`);

                // Decrease playbackRate by 5%
                agent.playbackRate *= 0.95;
                if (agent.audio) {
                    agent.audio.playbackRate = agent.playbackRate || 1;
                    agent.audio.preservesPitch = false;
                }
            }
            setTimeout(() => {
                for (const id in agents) {
                    const agent = agents[id];
                    if (!agent || !agent.sprite || !originalScale[id]) continue;

                    // Restore original scale and pitch
                    agent.sprite.scaleX = originalScale[id].x;
                    agent.sprite.scaleY = originalScale[id].y;
                    agent.playbackRate = originalPitch[id];
                    if (agent.audio) {
                        agent.audio.playbackRate = originalPitch[id];
                        agent.audio.preservesPitch = false;
                    }
                }
            }, 45000);
        }
    });
    socket.on("deflate", () => {
        const originalScale = {};
        const originalPitch = {};
        for (const id in agents) {
            const agent = agents[id];
            if (!agent || !agent.sprite) continue;

            if (agent.goingToSpeak) {
                // Save original scale and pitch
                originalScale[id] = { x: 1, y: 1 };
                originalPitch[id] = 1;
                // Enlarge the agent
                agent.sprite.scaleX *= 0.95;
                agent.sprite.scaleY *= 0.95;
                agent.$canvas.css("transform", `scale(${agent.sprite.scaleX})`);

                // Decrease playbackRate by 5%
                agent.playbackRate *= 1.05;
                if (agent.audio) {
                    agent.audio.playbackRate = agent.playbackRate || 1;
                    agent.audio.preservesPitch = false;
                }
            }
            setTimeout(() => {
                for (const id in agents) {
                    const agent = agents[id];
                    if (!agent || !agent.sprite || !originalScale[id]) continue;

                    // Restore original scale and pitch
                    agent.sprite.scaleX = originalScale[id].x;
                    agent.sprite.scaleY = originalScale[id].y;
                    agent.playbackRate = originalPitch[id];
                    if (agent.audio) {
                        agent.audio.playbackRate = originalPitch[id];
                        agent.audio.preservesPitch = false;
                    }
                }
            }, 45000);
        }
    });
    socket.on("bigger", (data) => {
        const originalScale = {};
        const originalPitch = {};
        const agent = agents[data.guid];
        if (!agent) return;
        if (agent.sprite.scaleX > 2) return;
                // Save original scale and pitch
                originalScale[data.guid] = { x: 1, y: 1 };
                originalPitch[data.guid] = 1;
                // Enlarge the agent
                agent.sprite.scaleX *= 1.05;
                agent.sprite.scaleY *= 1.05;
                agent.$canvas.css("transform", `scale(${agent.sprite.scaleX})`);

                // Decrease playbackRate by 5%
                agent.playbackRate *= 0.95;
                if (agent.audio) {
                    agent.audio.playbackRate = agent.playbackRate || 1;
                    agent.audio.preservesPitch = false;
                }
    });
    socket.on("smaller", (data) => {
        const originalScale = {};
        const originalPitch = {};
        const agent = agents[data.guid];
        if (!agent) return;
        if (agent.sprite.scaleX < 0.25) return;
                // Save original scale and pitch
                originalScale[data.guid] = { x: 1, y: 1 };
                originalPitch[data.guid] = 1;
                // Enlarge the agent
                agent.sprite.scaleX *= 0.95;
                agent.sprite.scaleY *= 0.95;
                agent.$canvas.css("transform", `scale(${agent.sprite.scaleX})`);

                // Decrease playbackRate by 5%
                agent.playbackRate *= 1.05;
                if (agent.audio) {
                    agent.audio.playbackRate = agent.playbackRate || 1;
                    agent.audio.preservesPitch = false;
                }
    });
    socket.on("reset", (data) => {
        const originalScale = {};
        const originalPitch = {};
        const agent = agents[data.guid];
        if (!agent) return;
        
                // Save original scale and pitch
                originalScale[data.guid] = { x: 1, y: 1 };
                originalPitch[data.guid] = 1;
                // Enlarge the agent
                agent.sprite.scaleX = 1;
                agent.sprite.scaleY = 1;

                agent.$canvas.css("transform", `scale(1)`);
                // Decrease playbackRate by 5%
                agent.playbackRate = 1;
                if (agent.audio) {
                    agent.audio.playbackRate = agent.playbackRate || 1;
                    agent.audio.preservesPitch = false;
                }
                
    });
    socket.on("smite", () => {
        var audio = new Audio("./smite.mp3");
        audio.play();
        const originalScale = {};
        const originalPitch = {};

        for (const id in agents) {
            const agent = agents[id];
            if (!agent || !agent.sprite) continue;

            // Save original scale and pitch
            originalScale[id] = { x: 1, y: 1 };
            originalPitch[id] = 1;

            // Make small and raise pitch
            agent.sprite.scaleX *= 0.5;
            agent.sprite.scaleY *= 0.5;
            agent.playbackRate *= 2;
        }

        setTimeout(() => {
            for (const id in agents) {
                const agent = agents[id];
                if (!agent || !agent.sprite || !originalScale[id]) continue;

                // Restore original scale and pitch
                agent.sprite.scaleX = originalScale[id].x;
                agent.sprite.scaleY = originalScale[id].y;
                agent.playbackRate = originalPitch[id];
            }
        }, 25000);
    });
    socket.on("nuke", (data) => {
        const agent = agents[data.id];

        const chance = Math.floor(Math.random() * 3) + 1;

        const debrischance = Math.floor(Math.random() * 3) + 1;

        if (chance === 1) {
            audio = new Audio("./explode3.wav");
            audio.play();
        } else if (chance === 2) {
            audio = new Audio("./explode4.wav");
            audio.play();
        } else if (chance === 3) {
            audio = new Audio("./explode5.wav");
            audio.play();
        }
        if (debrischance === 1) {
            audio2 = new Audio("./debris1.wav");
            audio2.play();
        } else if (debrischance === 2) {
            audio2 = new Audio("./debris2.wav");
            audio2.play();
        } else if (debrischance === 3) {
            audio2 = new Audio("./debris3.wav");
            audio2.play();
        }
        agent.explode();
        sfx.explode.currentTime = 0;
        sfx.explode.play();
    });

    socket.on("nuked", () => {
    });
    socket.on("blessed", () => {
        audio = new Audio("./blessed.wav");
        audio.play();
        blessedPopup();
    });
}

var usersAmt = 0;
var usersKeys = [];

function usersUpdate() {
    usersKeys = Object.keys(usersPublic);
    usersAmt = usersKeys.length;
}
function sendInput() {
    var text = $("#chat_message").val();
    $("#chat_message").val("");
    if (text.length > 0) {
        if (text.startsWith("/help")) {
            helpPopup();
            return;
        }
        if (text.startsWith("/classicbackground")) {
            $("body").addClass("classic");
            localStorage.classic = true;
            return;
        }
        if (text.startsWith("/newbackground")) {
            $("body").removeClass("classic");
            localStorage.classic = false;
            return;
        }
        if (text.startsWith("/vaporwave")) {
            $("body").addClass("vaporwave");
            socket.emit("command", { list: ["youtube", "aQkPcPqTq4M"] });
            localStorage.vaporwave = true;
            return;
        }
        if (text.startsWith("/unvaporwave")) {
            $("body").removeClass("vaporwave");
            localStorage.vaporwave = false;
            return;
        }
        var youtube = youtubeParser(text);
        if (youtube) {
            socket.emit("command", {
                list: ["youtube", youtube],
            });
            return;
        }

        if (text.substring(1, 0) == "/") {
            var list = text.substring(1).split(" ");
            if (list[0] === "settings") {
                openSettings();
                return;
            }
            if (text.startsWith("/color")) {
                color = list[1];
                localStorage.color = color;
            }
            if (text.startsWith("/techy")) {
                techy = list[1];
                localStorage.techy_code = techy;
            }
            if (text.startsWith("/pitch")) {
                localStorage.pitch = list[1];
            }
            if (text.startsWith("/speed")) {
                localStorage.speed = list[1];
            }
            if (text.startsWith("/mod_code")) {
                mod_code = list[1];
                localStorage.mod_code = mod_code;
            }
            if (text.startsWith("/bonzitv_code")) {
                localStorage.bonzitv_code = list[1];
            }
            if (text.startsWith("/dev_code")) {
                dev_code = list[1];
                localStorage.dev_code = dev_code;
            }
            if (text.startsWith("/agent")) {
                color = list[1];
                localStorage.color = color;
            }
            if (text.startsWith("/name")) {
                $("#login_name").val(text.replaceAll("/name ", ""));
                localStorage.name = text.replaceAll("/name ", "");
            }
            if (text.startsWith("/tag")) {
                localStorage.tag = text.replaceAll("/tag ", "").replaceAll("/tag", "");
            }
            if (text.startsWith("/voice")) {
                localStorage.voice = text.replaceAll("/voice ", "").replaceAll("/voice", "");
            }
            socket.emit("command", {
                list: list,
            });
        } else {
            socket.emit("talk", {
                text: text,
            });
        }
    }
}
// http://stackoverflow.com/a/1781750

function touchHandler(event) {
    var touches = event.changedTouches,
        first = touches[0],
        type = "";
    switch (event.type) {
        case "touchstart":
            type = "mousedown";
            break;
        case "touchmove":
            type = "mousemove";
            break;
        case "touchend":
            type = "mouseup";
            break;
        default:
            return;
    }

    // initMouseEvent(type, canBubble, cancelable, view, clickCount,
    //                screenX, screenY, clientX, clientY, ctrlKey,
    //                altKey, shiftKey, metaKey, button, relatedTarget);

    var simulatedEvent = document.createEvent("MouseEvent");
    simulatedEvent.initMouseEvent(type, true, true, window, 1, first.screenX, first.screenY, first.clientX, first.clientY, false, false, false, false, 0 /*left*/, null);

    first.target.dispatchEvent(simulatedEvent);
    // event.preventDefault();
}

$(window).load(function () {
    if (localStorage.length === 0) {
        initSettings();
    } else
        try {
            wordBlacklist = JSON.parse(localStorage.wordBlacklist);
            if (!isArray(wordBlacklist)) throw TypeError("wordBlacklist is not an array");
            for (let word of wordBlacklist) {
                if (typeof word !== "string") throw TypeError("wordBlacklist is broken");
            }
            document.body.classList.toggle("classic", localStorage.classicBg === "true");
        } catch (err) {
            console.error("Loading settings failed: ", err);
            initSettings();
        }
    if (localStorage.name) {
        $("#login_name").val(localStorage.name);
    }
    if (localStorage.room) {
        $("#login_room").val(localStorage.room);
    }
    if (localStorage.vaporwave == "true") {
        $("body").addClass("vaporwave");
    }
    if (localStorage.classic == "true") {
        $("body").addClass("classic");
    }
    document.addEventListener("touchstart", touchHandler, true);
    document.addEventListener("touchmove", touchHandler, true);
    document.addEventListener("touchend", touchHandler, true);
    document.addEventListener("touchcancel", touchHandler, true);

    $("#chat_log_button").click(function () {
        $("#chat_log_button").hide();
        $("#chat_log").show();
        window.onresize();
    });

    $("#chat_log_close").click(function () {
        $("#chat_log_button").show();
        $("#chat_log").hide();
    });

    window.onresize = () => {
        for (const id in agents) {
            const agent = agents[id];
            agent.move();
        }
    };
});

function newupdate() {
    alert("AgentCHAT Version 0.1.4b - Agents will now fall asleep from being idle/afk. This is the final update due to a request by our benefactors.");
}

function createIframeWindow(url, title = "New Window") {
    const window = document.createElement("div");
    window.className = "iframe-window";
    window.style.left = "50px";
    window.style.top = "50px";
    window.style.width = "600px";
    window.style.height = "450px";

    const titlebar = document.createElement("div");
    titlebar.className = "iframe-titlebar";

    const titleText = document.createElement("span");
    titleText.textContent = title;

    const controls = document.createElement("div");
    controls.className = "iframe-controls";

    const closeBtn = document.createElement("button");
    closeBtn.className = "iframe-control iframe-close";
    closeBtn.style.width = "16px";
    closeBtn.style.height = "16px";
    closeBtn.onclick = () => window.remove();

    const maximizeBtn = document.createElement("button");
    maximizeBtn.className = "iframe-control iframe-maximize";
    maximizeBtn.style.width = "16px";
    maximizeBtn.style.height = "16px";
    maximizeBtn.onclick = () => {
        if (window.style.width === "100vw") {
            window.style.width = "600px";
            window.style.height = "450px";
            window.style.left = "50px";
            window.style.top = "50px";
        } else {
            window.style.width = "100vw";
            window.style.height = "100vh";
            window.style.left = "0";
            window.style.top = "0";
        }
    };

    const minimizeBtn = document.createElement("button");
    minimizeBtn.className = "iframe-control iframe-minimize";
    minimizeBtn.style.width = "16px";
    minimizeBtn.style.height = "16px";
    minimizeBtn.onclick = () => {
        window.style.height = "36px";
    };

    controls.appendChild(minimizeBtn);
    controls.appendChild(maximizeBtn);
    controls.appendChild(closeBtn);

    titlebar.appendChild(titleText);
    titlebar.appendChild(controls);

    const iframe = document.createElement("iframe");
    iframe.className = "iframe-content";
    iframe.src = url;
    iframe.setAttribute("frameborder", "no");
    iframe.setAttribute("allowfullscreen", "true");
    iframe.setAttribute("webkitallowfullscreen", "true");
    iframe.setAttribute("mozallowfullscreen", "true");
    iframe.setAttribute("scrolling", "no");
    iframe.setAttribute("allow", "autoplay; fullscreen; gamepad");

    window.appendChild(titlebar);
    window.appendChild(iframe);
    document.body.appendChild(window);

    // Make window draggable
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;

    titlebar.onmousedown = dragStart;

    function dragStart(e) {
        initialX = e.clientX - window.offsetLeft;
        initialY = e.clientY - window.offsetTop;

        if (e.target === titlebar) {
            isDragging = true;
        }
    }

    document.onmousemove = drag;
    document.onmouseup = dragEnd;

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;

            window.style.left = `${currentX}px`;
            window.style.top = `${currentY}px`;
        }
    }

    function dragEnd() {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
    }
}

function addChatLog(username, message, type = "message", shouldSpeak = true) {
    const chatLog = document.getElementById("chatLog");
    const msgDiv = document.createElement("div");
    msgDiv.className = "message";

    const timestamp = new Date().toLocaleTimeString();
    msgDiv.innerHTML = `<span class="timestamp">[${timestamp}]</span> <span class="theusername">${username}:</span> ${message}`;

    chatLog.appendChild(msgDiv);
    chatLog.scrollTop = chatLog.scrollHeight;
}

// Add this function after the createSharedWindow function
const loadFlashPlayer = async (file, ruffleContainer) => {
    try {
        // Clear container and show loading state
        ruffleContainer.innerHTML = "<p>Loading Flash player...</p>";

        // Create dedicated container for the player
        const playerContainer = document.createElement("div");
        playerContainer.style.width = "100%";
        playerContainer.style.height = "100%";

        // Clear loading message
        ruffleContainer.innerHTML = "";

        // Create and configure player
        playerContainer.innerHTML = `<object type='application/x-shockwave-flash' data='${window.URL.createObjectURL(file)}' id='vv_player' width='400' height='300'><param name='movie' value='${window.URL.createObjectURL(
            file
        )}'><param name='allowFullScreen' value='true'></object>`;
        ruffleContainer.appendChild(playerContainer);
    } catch (error) {
        console.error("Error loading Flash or SWF:", error);
        ruffleContainer.innerHTML = `
            <p style="color: red">Error: ${error.message}</p>
            <p>Please try again</p>
            <input type="file" accept=".swf" />
        `;

        const newInput = ruffleContainer.querySelector("input");
        if (newInput) {
            newInput.onchange = async (e) => {
                if (e.target.files?.[0]) {
                    await loadFlashPlayer(e.target.files[0], ruffleContainer);
                }
            };
        }
    }
};

function blessedPopup() {
    new Dialog({
        title: "Blessmode",
        class: "flex_window",
        html: `
            <div class="blessed_body">
                <h1><marquee>YOU'VE BEEN BLESSED!</marquee></h1>
                Blessed is a VIP-like status given to users who I like.<br>
                You now have access to:<br>
                <ul>
                    <li> <b>Video and Image embedding</b>: Use the /video or /img command to display a file from catbox.moe.
                    <li> <b>More BonziCOINs</b>: You will earn 10 BonziCOINs<img src="bonzicoin.png" width=16> every 10 seconds.
                    <li> <b>You can't be kicked and nuked</b>: Blessed users are treated with care and kindness.
                </ul>
            </div>
        `,
        x: 300,
        y: 400,
        width: 600,
        height: 400,
    })
}
function coinPopup() {
    
        new Dialog({
            title: "Help Menu",
            class: "flex_window",
            html: `
                <h1>What are BonziCOINs?</h1>
                <hr>
                <span><b>BonziCOINs</b> are a virtual currency that can be used to buy cosmetics, hats, and special features.</span>
                <br>
                They can be earned by:
                <br>
                <li>Playing minigames in the 'minigames' room.</li>
                <li>Being blessed.</li>
                <li>Playing the available web games.</li>
                <li>Getting gifted coins by a highly trusted user (e.g. Siobhan, kern)</li>
                <br>
                Don't ask for coins.
            `,
            x: 300,
            y: 400,
            width: 600,
            height: 400,
        });
}
function createFlashWindow() {
    const window = document.createElement("div");
    window.className = "iframe-window";
    window.style.left = "50px";
    window.style.top = "50px";
    window.style.width = "600px";
    window.style.height = "450px";

    const titlebar = document.createElement("div");
    titlebar.className = "iframe-titlebar";

    const titleText = document.createElement("span");
    titleText.textContent = "Flash Player";

    const controls = document.createElement("div");
    controls.className = "iframe-controls";

    const closeBtn = document.createElement("button");
    closeBtn.className = "iframe-control iframe-close";
    closeBtn.onclick = () => window.remove();

    const maximizeBtn = document.createElement("button");
    maximizeBtn.className = "iframe-control iframe-maximize";
    maximizeBtn.onclick = () => {
        if (window.style.width === "100vw") {
            window.style.width = "600px";
            window.style.height = "450px";
            window.style.left = "50px";
            window.style.top = "50px";
        } else {
            window.style.width = "100vw";
            window.style.height = "100vh";
            window.style.left = "0";
            window.style.top = "0";
        }
    };

    const minimizeBtn = document.createElement("button");
    minimizeBtn.className = "iframe-control iframe-minimize";
    minimizeBtn.onclick = () => {
        window.style.height = "41px";
    };

    const behh = document.createElement("a");
    controls.appendChild(minimizeBtn);
    controls.appendChild(maximizeBtn);
    controls.appendChild(closeBtn);

    titlebar.appendChild(titleText);
    titlebar.appendChild(controls);

    // Create ruffle dropzone container
    const ruffleContainer = document.createElement("div");
    ruffleContainer.className = "ruffle-dropzone";
    ruffleContainer.innerHTML = `
        <p>Drop an SWF file here or click to select one</p>
        <input type="file" accept=".swf" />
		<button class="ruffle-demo">Or click here for a demo</a>
    `;
    // Handle file selection
    const fileInput = ruffleContainer.querySelector("input");
    fileInput.onchange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith(".swf")) {
            ruffleContainer.innerHTML = `
                <p style="color: red">Error: Please select a valid SWF file</p>
                <p>Please try again</p>
                <input type="file" accept=".swf" />
            `;
            return;
        }

        ruffleContainer.innerHTML = "<p>Loading SWF file...</p>";
        await loadFlashPlayer(file, ruffleContainer);
    };

    // Handle drag and drop
    ruffleContainer.ondragover = (e) => {
        e.preventDefault();
        ruffleContainer.style.backgroundColor = "rgba(0, 255, 0, 0.1)";
    };

    ruffleContainer.ondragleave = () => {
        ruffleContainer.style.backgroundColor = "rgba(0, 0, 0, 0.4)";
    };

    ruffleContainer.ondrop = async (e) => {
        e.preventDefault();
        ruffleContainer.style.backgroundColor = "rgba(0, 0, 0, 0.4)";

        try {
            const file = e.dataTransfer?.files?.[0];
            if (!file) {
                throw new Error("No file was dropped");
            }

            if (!file.name.toLowerCase().endsWith(".swf")) {
                throw new Error("Please drop a valid SWF file");
            }

            ruffleContainer.innerHTML = "<p>Loading SWF file...</p>";
            await loadFlashPlayer(file, ruffleContainer);
        } catch (error) {
            console.error("Drop error:", error);
            ruffleContainer.innerHTML = `
                <p style="color: red">Error: ${error.message}</p>
                <p>Please try again</p>
                <input type="file" accept=".swf" />
            `;
        }
    };
    $(".ruffle-demo").click(function () {
        // Clear container and show loading state
        ruffleContainer.innerHTML = "<p>Loading Flash player...</p>";

        // Create dedicated container for the player
        const playerContainer = document.createElement("div");
        playerContainer.style.width = "100%";
        playerContainer.style.height = "100%";

        // Clear loading message
        ruffleContainer.innerHTML = "";

        // Create and configure player
        playerContainer.innerHTML = `<object type='application/x-shockwave-flash' data='./swfs/precious_thing.swf' id='vv_player' width='400' height='300'><param name='movie' value='./swfs/precious_thing.swf'><param name='allowFullScreen' value='true'></object>`;
        ruffleContainer.appendChild(playerContainer);
    });

    window.appendChild(titlebar);
    window.appendChild(ruffleContainer);
    document.body.appendChild(window);

    makeDraggable(window, titlebar, false);

    $(".ruffle-demo").click(function () {
        // Clear container and show loading state
        ruffleContainer.innerHTML = "<p>Loading Flash player...</p>";

        // Create dedicated container for the player
        const playerContainer = document.createElement("div");
        playerContainer.style.width = "100%";
        playerContainer.style.height = "100%";

        // Clear loading message
        ruffleContainer.innerHTML = "";

        // Create and configure player
        playerContainer.innerHTML = `<object type='application/x-shockwave-flash' data='./swfs/precious_thing.swf' id='vv_player' width='400' height='300'><param name='movie' value='./swfs/precious_thing.swf'><param name='allowFullScreen' value='true'></object>`;
        ruffleContainer.appendChild(playerContainer);
    });

    return window;
}

function makeDraggable(window, titlebar, isStream) {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;

    titlebar.onmousedown = dragStart;

    function dragStart(e) {
        initialX = e.clientX - window.offsetLeft;
        initialY = e.clientY - window.offsetTop;

        if (e.target === titlebar) {
            isDragging = true;
        }
    }

    document.addEventListener("mousemove", drag);
    document.addEventListener("mouseup", dragEnd);

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;

            window.style.left = `${currentX}px`;
            window.style.top = `${currentY}px`;

            // If this is a stream window, broadcast position to other users
            if (isStream && currentStreamUser === room.party.client.username) {
                room.send({
                    type: "stream_window_moved",
                    left: window.style.left,
                    top: window.style.top,
                });
            }
        }
    }

    function dragEnd() {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
    }
}
