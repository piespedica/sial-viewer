import { TestBed } from '@angular/core/testing';
import { T8ViewerPageComponent } from './t8-viewer.page';

describe('T8ViewerPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [T8ViewerPageComponent],
    }).compileComponents();
  });

  it('shows the upload shell before any file is loaded', () => {
    const fixture = TestBed.createComponent(T8ViewerPageComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Let’s make the numbers real.');
  });
});
