import { TestBed } from '@angular/core/testing';
import { T8ViewerPortfolioTabComponent } from './t8-viewer-portfolio-tab.component';

describe('T8ViewerPortfolioTabComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [T8ViewerPortfolioTabComponent],
    }).compileComponents();
  });

  it('creates', () => {
    const fixture = TestBed.createComponent(T8ViewerPortfolioTabComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
