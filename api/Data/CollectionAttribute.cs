namespace Api.Data;

/// <summary>Optional: override the default collection name (lower-cased type name + "s").</summary>
[AttributeUsage(AttributeTargets.Class)]
public class CollectionAttribute(string name) : Attribute
{
    public string Name { get; } = name;
}
