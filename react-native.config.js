module.exports = {
    dependency: {
        platforms: {
            android: {
                packageImportPath: 'import app.meets.foregroundservice.ForegroundServicePackage;',
                packageInstance: 'new ForegroundServicePackage()',
            },
        },
    },
};