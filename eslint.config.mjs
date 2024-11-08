import tseslint from 'typescript-eslint';

export default tseslint.config(
    ...tseslint.configs.recommended,
    {
        ignores: [
            "auditLogMover/",
            "cdk.out/",
            "coverage/",
            "dist/",
            "scripts/"
        ],
    }
);