import { IsString } from 'class-validator';
import { Package } from '../../../types/models-shared';

export class PackageParams {
  @IsString()
  hostId: string;
}

export class InstallPackageDto {
  @IsString()
  package: string;
}

export class PackageListResponse {
  packages: Package[];
}

export class PackageInstallResponse {
  success: boolean;
}
