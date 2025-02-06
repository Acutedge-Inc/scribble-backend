module.exports = {
    MINIMUM_ALLOWED_YEAR: 1900,
    allowedMimes: {
        validationReport: [
            "image/png",
            "image/jpg",
            "image/jpeg",
            "video/mp4",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/x-cfb",
            "text/plain",
            "text/*",
        ],
        appDetailVideo: [
            "video/mp4",
            "video/mov",
            "video/wmv",
            "video/flv",
            "video/x-flv",
            "video/x-msvideo",
        ],
        appDetailImage: ["image/png", "image/jpg", "image/jpeg"],
        icon: ["image/png", "image/jpg", "image/jpeg"],
        appCertificate: [
            "application/pkix-cert",
            "application/x-x509-ca-cert",
            "application/x-pem-file",
            "application/x-pem-certificate",
            "application/octet-stream",
        ],
    },
    maxFileSize: {
        // 500MB
        validationReportVideo: 524288000,
        // 20MB
        validationReportNonVideo: 20971520,
        // 8MB
        appDetailScreenshot: 8388608,
        // 512MB
        appDetailVideo: 536870912,
        // 1MB
        appDetailIcon: 1048576,
        // 2MB
        appCertificate: 2097152,
    },
    mimeExtentionMapping: {
        "image/png": "png",
        "image/jpg": "jpg",
        "image/jpeg": ["jpeg", "jpg"],
        "video/mp4": "mp4",
        "application/pdf": "pdf",
        "application/msword": "doc",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
        "application/x-cfb": "exe",
        "text/plain": "txt",
        "text/*": "txt",
        "image/svg+xml": "svg",
        "video/mov": "mov",
        "video/wmv": "wmv",
        "video/flv": "flv",
        "video/x-flv": "flv",
        "video/x-msvideo": "avi",
        "application/pkix-cert": ["crt", "cert", "der", "rsa", "pem"],
        "application/x-x509-ca-cert": ["crt", "cert", "der", "rsa", "pem"],
        "application/x-pem-file": ["crt", "cert", "der", "rsa", "pem"],
        "application/x-pem-certificate": ["crt", "cert", "der", "rsa", "pem"],
        "application/octet-stream": ["crt", "cert", "der", "rsa", "pem"],
    },
    roleNames: {
        admin: "admin",
        oem: "oem",
        user: "user",
        dev: "dev",
        tester: "tester",
    },
};
