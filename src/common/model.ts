import { SNode, SLabel } from "sprotty-protocol"

export type PaperNode = {
    paperId: string
} & SNode

export type PaperLabel = {
    minZoomLevel: number
}

export type PaperAuthor = {
    authorId: string,
    name: string
}

export type Paper = {
    paperId: string,
    title: string,
    year: number,
    authors: PaperAuthor[],
    fieldsOfStudy: string[],
    isOpenAccess: boolean,
    added?: boolean
}

export type PaperMetaData = {
    authors: PaperAuthor[];
    fieldsOfStudy: string[];
}