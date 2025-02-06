const nconf = require("nconf");

const getAccountLabel = (APPSTORE_NAME) => {
    return {
        dev: `${APPSTORE_NAME} Developers`,
        tester: `${APPSTORE_NAME} Tester`,
        oem: `${APPSTORE_NAME} Automaker`,
        user: `${APPSTORE_NAME} App Store`,
    };
};

module.exports = (code, role, oemName) => {
    const APPSTORE_NAME = oemName === "skoda" ? "Skoda" : "Allgo";
    const accountLable = getAccountLabel(APPSTORE_NAME);

    return `<html>

    <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
        <link href='https://fonts.googleapis.com/css?family=Roboto' rel='stylesheet'>
        <style>
            body {
                margin: 0;
                font-family: 'Roboto';
                text-align: center;
                position: relative;
            }

            .container {
                width: 80%;
                margin: 0 auto;
                /* Center the DIV horizontally */
            }

            .fixed-body {
                text-align: center;
                position: absolute;
                top: 50%;
                left: 50%;
                -moz-transform: translateX(-50%) translateY(-50%);
                -webkit-transform: translateX(-50%) translateY(-50%);
                transform: translateX(-50%) translateY(-50%);
            }

            h1 {
                font-size: 22px;
                line-height: 27px;
                padding-top: 60px;
            }

            p {
                font-size: 18px;
                line-height: 27px;
            }

            .grey-text {
                color: #707070;
            }

            a {
                width: 160px;
                height: 40px;
                border: none;
                outline: none;
                border-radius: 7px;
                background: #000;
                color: white !important;
                font-weight: bold;
                font-size: 18px;
                margin-bottom: 12px;
                padding: 7px 15px;
                text-decoration:none;
            }

            a:hover {
                cursor: pointer;
            }

            hr {
                border-top: 1px solid #f7f7f7;
                margin-bottom: 30px;
                width:60%;
            }

            .fixed-header,
            .fixed-footer {
                display: flex;
                align-items: center;
                justify-self: center;
                text-align: center;
                width: 100%;
                position: fixed;
                background: #333;
                padding: 10px 0;
                color: #fff;
                margin: auto 0;
            }

            .fixed-header {
                top: 0;
                height: 60px;
            }

            .fixed-footer {
                bottom: 0;
            }

            .bold {
                font-weight: bold;
            }

            svg {
                margin-top: 20px;
            }

            .header-image {
                padding-top: 10px;
            }
        </style>
    </head>

    <body>
        <div class="fixed-header">
            <div class="container">
                <img class="header-image" src=${`${nconf.get(
                    "API_BASE_URL"
                )}/api/v1/asset/allgo.png`}></img>
            </div>
        </div>
        <div class="fixed-body">
            <h1 style="color: #e7792b">Thanks for signing up on ${
                accountLable[role] || `${APPSTORE_NAME} App Store`
            } Portal!</h1>
            ${
                role === "user"
                    ? `<p class="grey-text">Please click on the button below to verify your email
                address and activate your ${accountLable[role] || `${APPSTORE_NAME} App Store`} account.</p>
                <a href=${`${nconf.get("WEB_BASE_URL")}/verification/${code}`}>VERIFY NOW</a>
                <p  class="grey-text" style="margin-bottom: 60px;">Please note, this link expires 24 hours
                after your original verification request.</p>`
                    : `<p>Please contact the administrator to activate your ${accountLable[role] || `${APPSTORE_NAME} App Store`} account <p/>`
            }
            <hr />
            <p class="grey-text bold">We'd love to help!</p>
        </div>
        <div class="fixed-footer">
            <div class="container">
                <p>Thanks</p>
                <p>The ${APPSTORE_NAME} App Store Team</p>
            </div>
        </div>
    </body>

    </html>`;
};
