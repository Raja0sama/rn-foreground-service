module.exports = {
    dependency: {
        platforms: {
            android: {
                packageImportPath: 'import com.tikotas.foregroundservice.ForegroundServicePackage;',
                packageInstance: 'new ForegroundServicePackage()',
            },
        },
    },
};