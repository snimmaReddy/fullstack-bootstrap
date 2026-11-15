using Api.Data;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

/// <summary>
/// Example custom API built on the reusable <see cref="Db"/> helpers: query any schema, return records or your own shape.
/// </summary>
[ApiController]
[Route("api/reports")]
[Tags("Reports")]
public class ReportsController(Db db) : ControllerBase
{
    /// <summary>In-stock products with quantity below a threshold (default 10), lowest first, with their supplier.</summary>
    [HttpGet("low-stock")]
    [ProducesResponseType<List<Record>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<Record>>> LowStock([FromQuery] int below = 10) =>
        await db.List("product", Query
            .Where("quantity", Op.Lt, below)
            .And("inStock", true)
            .Sort("quantity")
            .Include("supplier"));

    /// <summary>One supplier with product count and stock totals.</summary>
    [HttpGet("suppliers/{id}/summary")]
    [ProducesResponseType<SupplierSummary>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupplierSummary>> SupplierSummary(string id)
    {
        var supplier = await db.Get("supplier", id, "products");
        if (supplier is null) return NotFound();

        var products = (List<Record>)supplier["products"]!;
        static long Quantity(Record p) => p.GetValueOrDefault("quantity") as long? ?? 0;
        static double Price(Record p) => p.GetValueOrDefault("price") as double? ?? 0;

        return new SupplierSummary(
            Supplier: (string)supplier["name"]!,
            ProductCount: products.Count,
            OutOfStock: products.Count(p => p.GetValueOrDefault("inStock") is false),
            UnitsInStock: products.Sum(Quantity),
            StockValue: Math.Round(products.Sum(p => Quantity(p) * Price(p)), 2));
    }
}

public record SupplierSummary(string Supplier, int ProductCount, int OutOfStock, long UnitsInStock, double StockValue);
