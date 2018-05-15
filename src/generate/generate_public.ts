import { Parser } from "../parse/parser_public"
import { genUmdModule, genWrapperFunction } from "./generate"
import { Rule } from "../parse/grammar/gast/gast_public"
import { IParserConfig, TokenVocabulary } from "../../api"

export function generateParserFactory<T extends Parser>(options: {
    name: string
    rules: Rule[]
    tokenVocabulary: TokenVocabulary
}): (config?: IParserConfig) => T {
    const wrapperText = genWrapperFunction({
        name: options.name,
        rules: options.rules
    })

    const constructorWrapper = new Function(
        "tokenVocabulary",
        "config",
        "chevrotain",
        wrapperText
    )

    return function(config) {
        return constructorWrapper(
            options.tokenVocabulary,
            config,
            // TODO: check how the require is transpiled/webpacked
            require("../api")
        )
    }
}

/**
 * This would generate the string literal for a UMD module (@link {https://github.com/umdjs/umd})
 * That exports a Parser Constructor.
 *
 * Note that the constructor exposed by the generated module must receive the TokenVocabulary as the first
 * argument, the IParser config can be passed as the second argument.
 */
export function generateParserModule(options: {
    name: string
    rules: Rule[]
}): string {
    return genUmdModule({ name: options.name, rules: options.rules })
}
