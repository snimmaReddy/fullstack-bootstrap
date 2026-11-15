using Api.Data;

namespace Api.Endpoints;

/// <summary>
/// Example custom endpoints built on the reusable <see cref="Db"/> helpers.
/// Copy this file as a template: inject Db, query any schema, return records or your own shape.
/// </summary>
public static class ReportEndpoints
{
    public static void MapReportEndpoints(this IEndpointRouteBuilder app)
    {
        var reports = app.MapGroup("/api/reports").WithTags("Reports");

        // In-stock products running low, lowest first, with their supplier embedded.
        reports.MapGet("/low-stock", (Db db, int? below) =>
            db.List("product", Query
                .Where("quantity", Op.Lt, below ?? 10)
                .And("inStock", true)
                .Sort("quantity")
                .Include("supplier")));

        // One supplier with its products and simple stock totals.
        reports.MapGet("/suppliers/{id}/summary", async (Db db, string id) =>
        {
            var supplier = await db.Get("supplier", id, "products") ?? throw NotFoundError.Record("supplier", id);
            var products = (List<Record>)supplier["products"]!;

            long Quantity(Record p) => p.GetValueOrDefault("quantity") as long? ?? 0;
            double Price(Record p) => p.GetValueOrDefault("price") as double? ?? 0;

            return new
            {
                supplier = supplier["name"],
                productCount = products.Count,
                outOfStock = products.Count(p => p.GetValueOrDefault("inStock") is false),
                unitsInStock = products.Sum(Quantity),
                stockValue = Math.Round(products.Sum(p => Quantity(p) * Price(p)), 2),
            };
        });
    }
}
