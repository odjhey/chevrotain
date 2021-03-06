import { TokenType } from "./lexer_public"
import {
    cloneArr,
    compact,
    contains,
    difference,
    flatten,
    forEach,
    has,
    isArray,
    isEmpty,
    map
} from "../utils/utils"
import { HashTable } from "../lang/lang_extensions"
import { tokenName } from "./tokens_public"

export function tokenStructuredMatcher(tokInstance, tokConstructor) {
    const instanceType = tokInstance.tokenTypeIdx
    if (instanceType === tokConstructor.tokenTypeIdx) {
        return true
    } else {
        return (
            tokConstructor.isParent === true &&
            tokConstructor.categoryMatchesMap[instanceType] === true
        )
    }
}

// Optimized tokenMatcher in case our grammar does not use token categories
// Being so tiny it is much more likely to be in-lined and this avoid the function call overhead
export function tokenStructuredMatcherNoCategories(token, tokType) {
    return token.tokenTypeIdx === tokType.tokenTypeIdx
}

export let tokenShortNameIdx = 1
export const tokenIdxToClass = new HashTable<TokenType>()

export function augmentTokenTypes(tokenTypes: TokenType[]): void {
    // collect the parent Token Types as well.
    let tokenTypesAndParents = expandCategories(tokenTypes)

    // add required tokenType and categoryMatches properties
    assignTokenDefaultProps(tokenTypesAndParents)

    // fill up the categoryMatches
    assignCategoriesMapProp(tokenTypesAndParents)
    assignCategoriesTokensProp(tokenTypesAndParents)

    forEach(tokenTypesAndParents, tokType => {
        tokType.isParent = tokType.categoryMatches.length > 0
    })
}

export function expandCategories(tokenTypes: TokenType[]): TokenType[] {
    let result = cloneArr(tokenTypes)

    let categories = tokenTypes
    let searching = true
    while (searching) {
        categories = compact(
            flatten(map(categories, currTokType => currTokType.CATEGORIES))
        )

        let newCategories = difference(categories, result)

        result = result.concat(newCategories)

        if (isEmpty(newCategories)) {
            searching = false
        } else {
            categories = newCategories
        }
    }
    return result
}

export function assignTokenDefaultProps(tokenTypes: TokenType[]): void {
    forEach(tokenTypes, currTokType => {
        if (!hasShortKeyProperty(currTokType)) {
            tokenIdxToClass.put(tokenShortNameIdx, currTokType)
            ;(<any>currTokType).tokenTypeIdx = tokenShortNameIdx++
        }

        // CATEGORIES? : TokenType | TokenType[]
        if (
            hasCategoriesProperty(currTokType) &&
            !isArray(currTokType.CATEGORIES)
            // &&
            // !isUndefined(currTokType.CATEGORIES.PATTERN)
        ) {
            currTokType.CATEGORIES = [currTokType.CATEGORIES]
        }

        if (!hasCategoriesProperty(currTokType)) {
            currTokType.CATEGORIES = []
        }

        if (!hasExtendingTokensTypesProperty(currTokType)) {
            currTokType.categoryMatches = []
        }

        if (!hasExtendingTokensTypesMapProperty(currTokType)) {
            currTokType.categoryMatchesMap = {}
        }

        if (!hasTokenNameProperty(currTokType)) {
            // saved for fast access during CST building.
            currTokType.tokenName = tokenName(currTokType)
        }
    })
}

export function assignCategoriesTokensProp(tokenTypes: TokenType[]): void {
    forEach(tokenTypes, currTokType => {
        // avoid duplications
        currTokType.categoryMatches = []
        forEach(currTokType.categoryMatchesMap, (val, key) => {
            currTokType.categoryMatches.push(
                tokenIdxToClass.get(key).tokenTypeIdx
            )
        })
    })
}

export function assignCategoriesMapProp(tokenTypes: TokenType[]): void {
    forEach(tokenTypes, currTokType => {
        singleAssignCategoriesToksMap([], currTokType)
    })
}

export function singleAssignCategoriesToksMap(
    path: TokenType[],
    nextNode: TokenType
): void {
    forEach(path, pathNode => {
        nextNode.categoryMatchesMap[pathNode.tokenTypeIdx] = true
    })

    forEach(nextNode.CATEGORIES, nextCategory => {
        const newPath = path.concat(nextNode)
        // avoids infinite loops due to cyclic categories.
        if (!contains(newPath, nextCategory)) {
            singleAssignCategoriesToksMap(newPath, nextCategory)
        }
    })
}

export function hasShortKeyProperty(tokType: TokenType): boolean {
    return has(tokType, "tokenTypeIdx")
}

export function hasCategoriesProperty(tokType: TokenType): boolean {
    return has(tokType, "CATEGORIES")
}

export function hasExtendingTokensTypesProperty(tokType: TokenType): boolean {
    return has(tokType, "categoryMatches")
}

export function hasExtendingTokensTypesMapProperty(
    tokType: TokenType
): boolean {
    return has(tokType, "categoryMatchesMap")
}

export function hasTokenNameProperty(tokType: TokenType): boolean {
    return has(tokType, "tokenName")
}

export function isTokenType(tokType: TokenType): boolean {
    return has(tokType, "tokenTypeIdx")
}
