class User {
    /**
     * Creates a User object.
     * @param {WebSocket} ws WebSocket object associated with the user
     * @param {String} username Name assigned to the user
     * @param {String} ip IP address of the user
     * @param {String} country ISO-3166 2-character country code of the user
     */
    constructor(ws, username, ip, country) {
        this.ws = ws;
        this.username = username;
        this.ip = ip;
        this.country = country;
    }

    /**
     * Returns the visible attributes of the User object
     */
    get visible() {
        return {
            username: this.username,
            country: this.country,
        }
    }
}

class UserMessage {
    /**
     * Creates a UserMessage object
     * @param {User} sender a User object, must be non-null
     * @param {Boolean} visible true if message is visible (passes filter), false otherwise
     * @param {Number} time Unix time (in seconds) where the message was sent
     * @param {String} text message text
     */
    constructor(sender, visible, time, text) {
        this.sender = sender;
        this.visible = visible;
        this.time = time;
        this.text = text;
    }

    /**
     * Returns the visible attributes of the UserMessage object in JSON format
     */
    get json() {
        return JSON.stringify({
            type: "USER_MESSAGE",
            sender: this.sender.visible,
            time: this.time,
            text: this.text,
        })
    }
}

class AdminMessage {
    /**
     * 
     * @param {String} type Can be "WELCOME" | "UPDATE_STATE" | "ERROR" | "ADMIN_MESSAGE"
     * @param {Number} time Unix time (in seconds) where the message was sent
     * @param {User} receiver User object representing the receiver. Used for "WELCOME" messages.
     * @param {Object} state Object representing the state of the chatroom. Used for "UPDATE_STATE" messages.
     * @param {String} text Message text. Used for "ERROR" and "ADMIN_MESSAGE" messages.
     */
    constructor(type, time, receiver, state, text) {
        this.type = type;
        this.time = time;
        this.receiver = receiver;
        this.state = state;
        this.text = text;
    }

    /**
     * Returns the visible attributes of the AdminMessage object in JSON format
     */
    get json() {
        const payload = {
            type: this.type,
            time: this.time,
        };

        if (this.type == "WELCOME") {
            payload.receiver = this.receiver.visible;
        }
        if (this.type == "UPDATE_STATE") {
            payload.state = this.state;
        }
        if (this.type == "ERROR" || this.type == "ADMIN_MESSAGE") {
            payload.text = this.text;
        }

        return JSON.stringify(payload);
    }
}

module.exports = {
    User,
    UserMessage,
    AdminMessage,
};
