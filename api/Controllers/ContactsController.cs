using Api.Models;
using Api.Repositories;
using Microsoft.AspNetCore.Authorization;

namespace Api.Controllers;

// A full CRUD API for Contact in one line.
// Public for now so the UI demo works before the UI has a login page; remove to require sign-in.
[AllowAnonymous]
public class ContactsController(IRepository<Contact> repo) : CrudController<Contact>(repo);
