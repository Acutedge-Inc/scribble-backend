const nconf = require("nconf");

const getAccountLabel = (APPSTORE_NAME) => {
  return {
    dev: `${APPSTORE_NAME} Developers`,
    tester: `${APPSTORE_NAME} Tester`,
    oem: `${APPSTORE_NAME} Automaker`,
    user: `${APPSTORE_NAME} App Store`,
  };
};

module.exports = (password, firstName) => {
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
                <a href=${process.env.WEB_URL}>Your Journey with Scribble Starts Here</a>
            </div>
        </div>
        <div class="fixed-body" style="text-align: left;">
            <p>
                Hi ${firstName.charAt(0).toUpperCase() + firstName.slice(1)},<br><br>
                Welcome to Scribble! We're excited to have you on board as we work together to transform healthcare.<br><br>
                To get you started, we've generated a temporary password for your account:<br><br>
                <strong>Temporary Password: ${password}</strong><br><br>
                For your security, you'll need to update this password when you log in for the first time. Here’s how:<br>
                Click on the login link below.<br>
                Enter your email and the temporary password provided above.<br>
                Follow the prompts to set a new, secure password of your choice.<br><br>
                If you run into any issues or have questions, our support team is here to help. You can reach us at <a href="mailto:support@goscribble.ai">support@goscribble.ai</a>.<br><br>
                Thank you for choosing Scribble!<br><br>
                Best regards,<br><br>
                The Scribble Team
            </p>
        </div>
        <div class="fixed-footer">
            <div class="container"><a href=${process.env.WEB_URL}>goscribble.ai </a></div>
        </div>
    </body>

    </html>`;
};
