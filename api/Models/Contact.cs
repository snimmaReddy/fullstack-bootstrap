using System.ComponentModel.DataAnnotations;

namespace Api.Models;

// Sample schema. DataAnnotations drive automatic 400 validation responses.
public class Contact : BaseEntity
{
    [Required, StringLength(100)]
    public string Name { get; set; } = "";

    [Required, EmailAddress]
    public string Email { get; set; } = "";

    [StringLength(1000)]
    public string? Message { get; set; }
}
