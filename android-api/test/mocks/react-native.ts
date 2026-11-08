/** Test double: the domain code only reads `Platform.OS`. */
export const Platform = { OS: 'android' as string, select: <T,>(options: { android?: T; default?: T }) => options.android ?? options.default };
