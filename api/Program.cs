using Api.Data;
using Api.Schemas;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// ---- Database ----
builder.Services.Configure<MongoSettings>(builder.Configuration.GetSection("Mongo"));
builder.Services.AddSingleton<MongoContext>();

// ---- JSON schemas (schemas/*.json → collections, validators, /api/data/{name}) ----
builder.Services.Configure<SchemaOptions>(builder.Configuration.GetSection("Schemas"));
builder.Services.AddSingleton<SchemaSync>();
builder.Services.AddSingleton<SchemaRegistry>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<SchemaRegistry>());

// Reusable data helpers for any schema (inject Db into controllers) + 400/404/409 error mapping.
builder.Services.AddSingleton<Db>();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<DataErrorHandler>();

// ---- Web ----
builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? [])
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()));

var app = builder.Build();

app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();               // /openapi/v1.json
    app.MapScalarApiReference();    // /scalar  (interactive API docs)
}

app.UseCors();
app.MapControllers();
app.Run();
