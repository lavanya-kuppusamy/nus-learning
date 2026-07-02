import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { LinksService, Link } from './links.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private svc = inject(LinksService);

  links = signal<Link[]>([]);
  latestLink = signal<Link | null>(null);
  error = signal<string | null>(null);
  submitting = signal(false);

  urlControl = new FormControl('', [
    Validators.required,
    Validators.pattern(/^https?:\/\/.+/),
  ]);

  ngOnInit(): void {
    this.loadLinks();
  }

  loadLinks(): void {
    this.svc.list().subscribe({ next: (data) => this.links.set(data) });
  }

  shorten(): void {
    this.urlControl.markAsTouched();
    if (this.urlControl.invalid) return;

    this.submitting.set(true);
    this.error.set(null);
    this.latestLink.set(null);

    this.svc.shorten(this.urlControl.value!).subscribe({
      next: (link) => {
        this.latestLink.set(link);
        this.links.update((prev) => [link, ...prev]);
        this.urlControl.reset();
        this.submitting.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error ?? 'Network error — is the backend running?');
        this.submitting.set(false);
      },
    });
  }
}
