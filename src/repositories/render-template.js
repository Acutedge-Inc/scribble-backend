const nconf = require("nconf");

const serviceApplicationStatuses = require("../services/application-statuses");

module.exports.appValidationStatusTemplate = (data, status) => {
  switch (status) {
    case serviceApplicationStatuses.getStatusByName("approved").id: // TODO- remove this line or add alternative
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
                        margin: 7px;
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
                        background: #62B866;
                        color: white !important;
                        font-weight: bold;
                        font-size: 18px;
                        margin-bottom: 60px;
                        padding: 7px 15px;
                        text-decoration: none;
                    }
            
                    a:hover {
                        cursor: pointer;
                    }
            
                    hr {
                        border-top: 1px solid #f7f7f7;
                        margin-bottom: 30px;
                        margin-top: 30px;
                        width: 60%;
                    }
            
                    .fixed-header,
                    .fixed-footer {
                        display: flex;
                        text-align: center;
                        align-items: center;
                        justify-self: center;
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
                      <img class="header-image" src=${data.iconUrl}></img>
                    </div>
                </div>
                <div class="fixed-body">
                    <h1>${data.message}</h1>
                    <p class="grey-text">Your app has been approved and is ready to be published on the AllGo App Store. Click on the button below for detailed report.</p>
                    <div style="margin:25px;"><a href=${nconf.get(
                      "WEB_BASE_URL",
                    )}>VIEW REPORT</a></div>
                    <hr />
                    <p class="grey-text">If you have any questions, simply reply to this email.</p>
                    <p class="grey-text bold">We'd love to help!</p>
                </div>
                <div class="fixed-footer">
                    <div class="container">
                        <p>Thanks</p>
                        <p>The AllGo App Store Team</p>
                    </div>
                </div>
            </body>
            
            </html>`;
    case serviceApplicationStatuses.getStatusByName("rejected").id:
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
                          margin: 7px;
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
                          background: #f3594e;
                          color: white !important;
                          font-weight: bold;
                          font-size: 18px;
                          margin-bottom: 60px;
                          padding: 7px 15px;
                          text-decoration: none;
                      }
              
                      a:hover {
                          cursor: pointer;
                      }
              
                      hr {
                          border-top: 1px solid #f7f7f7;
                          margin-bottom: 30px;
                          margin-top: 30px;
                          width: 60%;
                      }
              
                      .fixed-header,
                      .fixed-footer {
                          display: flex;
                          align-items: center;
                          justify-self: center;
                          width: 100%;
                          position: fixed;
                          background: #333;
                          padding: 10px 0;
                          color: #fff;
                          margin: auto 0;
                          text-align: center;
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
                        <img class="header-image" src=${data.iconUrl}></img>
                      </div>
                  </div>
                  <div class="fixed-body">
                      <h1>${data.message}</h1>
                      <p class="grey-text">We noticed a few issues that need to be addressed before it can be approved on the AllGo App Store.
                      Click on the button below for detailed report.</p>
                      <div style="margin:25px;"><a href=${nconf.get(
                        "WEB_BASE_URL",
                      )}>VIEW REPORT</a></div>
                      <hr />
                      <p class="grey-text">If you have any questions, simply reply to this email.</p>
                      <p class="grey-text bold">We'd love to help!</p>
                  </div>
                  <div class="fixed-footer">
                      <div class="container">
                          <p>Thanks</p>
                          <p>The AllGo App Store Team</p>
                      </div>
                  </div>
              </body>
              
              </html>`;
    case serviceApplicationStatuses.getStatusByName("published").id:
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
                          margin: 7px;
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
                          background: #62B866;
                          color: white !important;
                          font-weight: bold;
                          font-size: 18px;
                          margin-bottom: 60px;
                          padding: 7px 15px;
                          text-decoration: none;
                      }
              
                      a:hover {
                          cursor: pointer;
                      }
              
                      hr {
                          border-top: 1px solid #f7f7f7;
                          margin-bottom: 30px;
                          margin-top: 30px;
                          width: 60%;
                      }
              
                      .fixed-header,
                      .fixed-footer {
                          display: flex;
                          text-align:center;
                          align-items: center;
                          justify-self: center;
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
                        <img class="header-image" src=${data.iconUrl}></img>
                      </div>
                  </div>
                  <div class="fixed-body">
                      <h1>${data.message}</h1>
                      <p class="grey-text">Your app is live on the AllGo App Store by ${
                        data.company
                      }. Click on the button below for detailed insights.</p>
                      <div style="margin:25px;"><a href=${nconf.get(
                        "WEB_BASE_URL",
                      )}>VIEW INSIGHTS</a></div>
                      <hr />
                      <p class="grey-text">If you have any questions, simply reply to this email.</p>
                      <p class="grey-text bold">We'd love to help!</p>
                  </div>
                  <div class="fixed-footer">
                      <div class="container">
                          <p>Thanks</p>
                          <p>The AllGo App Store Team</p>
                      </div>
                  </div>
              </body>
              
              </html>`;
    case serviceApplicationStatuses.getStatusByName("revoked").id:
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
                          margin: 7px;
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
                          background: #62B866;
                          color: white !important;
                          font-weight: bold;
                          font-size: 18px;
                          margin-bottom: 60px;
                          padding: 7px 15px;
                          text-decoration: none;
                      }
              
                      a:hover {
                          cursor: pointer;
                      }
              
                      hr {
                          border-top: 1px solid #f7f7f7;
                          margin-bottom: 30px;
                          margin-top: 30px;
                          width: 60%;
                      }
              
                      .fixed-header,
                      .fixed-footer {
                          display: flex;
                          align-items: center;
                          justify-self: center;
                          width: 100%;
                          position: fixed;
                          background: #333;
                          padding: 10px 0;
                          color: #fff;
                          margin: auto 0;
                          text-align: center;
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
                          <img class="header-image" src=${data.iconUrl}></img>
                      </div>
                  </div>
                  <div class="fixed-body">
                      <h1>${data.message}!</h1>
                      <p class="grey-text">Your app is revoked on the AllGo App Store by ${
                        data.company
                      }. Click on the button below for detailed insights.</p>
                      <div style="margin:25px;"><a href=${nconf.get(
                        "WEB_BASE_URL",
                      )}>VIEW INSIGHTS</a></div>
                      <hr />
                      <p class="grey-text">If you have any questions, simply reply to this email.</p>
                      <p class="grey-text bold">We'd love to help!</p>
                  </div>
                  <div class="fixed-footer">
                      <div class="container">
                          <p>Thanks</p>
                          <p>The AllGo App Store Team</p>
                      </div>
                  </div>
              </body>
              
              </html>`;
    default:
      throw new Error("Email Template not defined");
  }
};
