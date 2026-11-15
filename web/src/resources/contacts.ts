import type { Entity, ResourceConfig } from '../types';

export interface Contact extends Entity {
  name: string;
  email: string;
  message?: string;
}

const contacts: ResourceConfig<Contact> = {
  key: 'contacts',
  title: 'Contacts',
  endpoint: '/api/contacts',
  fields: [
    { name: 'name', label: 'Name', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'message', label: 'Message', type: 'textarea' },
  ],
};

export default contacts;
