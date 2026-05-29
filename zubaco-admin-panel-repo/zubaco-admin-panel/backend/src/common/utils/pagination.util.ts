interface PaginationMetaParams {
    page: number;
    limit: number;
    total: number;
}

export function buildPaginationMeta({ page, limit, total }: PaginationMetaParams) {
    const total_pages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
        page,
        limit,
        total,
        total_pages,
        has_next: page < total_pages,
        has_previous: page > 1 && total_pages > 0,
    };
}
