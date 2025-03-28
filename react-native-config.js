module.exports = {
    dependency: {
        platforms: {
            android: {
                packageImportPath: 'import com.supersami.foregroundservice.ForegroundServicePackage;\nimport com.supersami.foregroundservice.ForegroundServiceExtendedPackage;',
                packageInstance: 'new ForegroundServicePackage(),\n      new ForegroundServiceExtendedPackage()'
            },
        },
    },
};